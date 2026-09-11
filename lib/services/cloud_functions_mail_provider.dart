import 'dart:convert';
import 'dart:io';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:meta/meta.dart';

import '../models/category_rule.dart';
import '../models/email_meta.dart';
import '../models/linked_account.dart';
import 'local_cache_service.dart';
import 'mail_provider.dart';

/// Gmail/Outlook/IMAP共通の実装基盤。
/// OAuthトークン・IMAPアプリパスワードはCloud Functions側（Secret Manager）でのみ保持し、
/// クライアントには平文で渡さない。クライアントはCallable Functions越しに命令するだけ。
///
/// ローカルキャッシング戦略を実装：
/// - メール本文: 24時間TTL でSQLiteキャッシュ
/// - 添付ファイル: 7日TTLで保持（本文と一緒に24h後に期限切れになる）
abstract class CloudFunctionsMailProvider implements MailProvider {
  CloudFunctionsMailProvider({
    FirebaseFunctions? functions,
    LocalCacheService? cacheService,
  })
    : _functions = functions ?? FirebaseFunctions.instance,
      _cacheService = cacheService ?? LocalCacheService();

  final FirebaseFunctions _functions;
  final LocalCacheService _cacheService;

  String get _providerKey => mailProviderTypeToString(providerType);

  /// Decompresses gzip-compressed HTML that was base64-encoded by Cloud Functions.
  /// Returns original decompressed HTML string, or the input string if not compressed.
  @visibleForTesting
  String decompressHtml(String html, bool isCompressed) {
    if (!isCompressed) return html;

    try {
      // Decode base64
      final bytes = base64Decode(html);
      // Decompress gzip
      final decompressed = gzip.decode(bytes);
      // Convert back to UTF-8 string
      return utf8.decode(decompressed);
    } catch (e) {
      // If decompression fails, log and return original
      debugPrint('[fetchMessageBody] Decompression failed: $e');
      return html;
    }
  }

  @override
  Future<LinkedAccount> connect({
    required String userId,
    Map<String, dynamic> params = const {},
  }) async {
    final callable = _functions.httpsCallable('connectAccount');
    final result = await callable.call<Map<String, dynamic>>({
      'provider': _providerKey,
      'userId': userId,
      ...params,
    });
    final data = Map<String, dynamic>.from(result.data as Map);
    return LinkedAccount.fromMap(data['id'] as String, data);
  }

  @override
  Future<List<ScanResultItem>> scan({required LinkedAccount account}) async {
    final callable = _functions.httpsCallable('scanAccount');
    final result = await callable.call<Map<String, dynamic>>({
      'provider': _providerKey,
      'accountId': account.id,
    });
    final data = Map<String, dynamic>.from(result.data as Map);
    final items = (data['items'] as List<dynamic>? ?? []).map((raw) {
      final m = Map<String, dynamic>.from(raw as Map);
      return ScanResultItem(
        meta: EmailMeta.fromMap(m['id'] as String, m),
        subject: m['subject'] as String? ?? '',
        senderEmail: m['senderEmail'] as String? ?? '',
      );
    }).toList();
    return items;
  }

  @override
  Future<void> archive({
    required LinkedAccount account,
    required List<String> emailIds,
  }) async {
    final callable = _functions.httpsCallable('applyArchiveRules');
    await callable.call<Map<String, dynamic>>({
      'provider': _providerKey,
      'accountId': account.id,
      'emailIds': emailIds,
    });
  }

  @override
  Future<void> restore({
    required LinkedAccount account,
    required List<String> emailIds,
  }) async {
    final callable = _functions.httpsCallable('restoreEmail');
    await callable.call<Map<String, dynamic>>({
      'provider': _providerKey,
      'accountId': account.id,
      'emailIds': emailIds,
    });
  }

  @override
  Future<List<String>> listCategories({required LinkedAccount account}) async {
    return MailCategory.values.map(mailCategoryToString).toList();
  }

  @override
  Future<MessageBody> fetchMessageBody({
    required LinkedAccount account,
    required String messageId,
  }) async {
    // ①キャッシュをチェック（24時間以内なら Cloud Functions 呼び出しをスキップ）。
    final cached = await _cacheService.getMessageBodyCache(messageId, account.id);
    if (cached != null) {
      return MessageBody(
        messageId: messageId,
        html: cached.html,
        attachmentNames: cached.attachmentNames,
      );
    }

    // ②キャッシュなし（または期限切れ）→ Cloud Functions から取得。
    final callable = _functions.httpsCallable('fetchMessageBody');
    final result = await callable.call<Map<String, dynamic>>({
      'provider': _providerKey,
      'accountId': account.id,
      'messageId': messageId,
    });
    final data = Map<String, dynamic>.from(result.data as Map);
    var html = data['html'] as String? ?? '';
    final attachmentNames = (data['attachmentNames'] as List<dynamic>? ?? [])
        .cast<String>();
    final isCompressed = (data['isCompressed'] as bool?) ?? false;
    final originalSize = data['originalSize'] as int?;
    final compressedSize = data['compressedSize'] as int?;

    // ②-b: Decompress HTML if it was compressed by Cloud Functions
    html = decompressHtml(html, isCompressed);

    // ③取得結果をキャッシュに保存（次回同じメール閲覧時はスキップ）。
    // Store decompressed HTML in cache (marked as no longer compressed since we decompressed it)
    await _cacheService.cacheMessageBody(
      messageId: messageId,
      accountId: account.id,
      html: html,
      attachmentNames: attachmentNames,
      isCompressed: false, // Already decompressed, so mark as not compressed
      originalSize: originalSize,
      compressedSize: compressedSize,
    );

    return MessageBody(
      messageId: messageId,
      html: html,
      attachmentNames: attachmentNames,
    );
  }
}

/// gmail.modify（Tier2） + gmail.labels（non-sensitive）のみ使用。
/// gmail.readonly（restricted）/ gmail.insert（restricted）は使用しない。
class GmailProvider extends CloudFunctionsMailProvider {
  GmailProvider({
    super.functions,
    super.cacheService,
  });

  @override
  MailProviderType get providerType => MailProviderType.gmail;
}

/// Microsoft Graph API Mail.ReadWrite（delegated、個人アカウント同意のみで完結）。
class OutlookProvider extends CloudFunctionsMailProvider {
  OutlookProvider({
    super.functions,
    super.cacheService,
  });

  @override
  MailProviderType get providerType => MailProviderType.outlook;
}

/// 標準IMAP/SMTP（Yahoo!メール・iCloud等）、アプリ専用パスワード方式。OAuth審査対象外。
class ImapProvider extends CloudFunctionsMailProvider {
  ImapProvider({
    super.functions,
    super.cacheService,
  });

  @override
  MailProviderType get providerType => MailProviderType.imap;
}

/// providerType からインスタンスを解決する。
MailProvider resolveMailProvider(MailProviderType type) {
  switch (type) {
    case MailProviderType.gmail:
      return GmailProvider();
    case MailProviderType.outlook:
      return OutlookProvider();
    case MailProviderType.imap:
      return ImapProvider();
  }
}
