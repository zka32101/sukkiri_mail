import 'package:cloud_functions/cloud_functions.dart';

import '../models/category_rule.dart';
import '../models/email_meta.dart';
import '../models/linked_account.dart';
import 'mail_provider.dart';

/// Gmail/Outlook/IMAP共通の実装基盤。
/// OAuthトークン・IMAPアプリパスワードはCloud Functions側（Secret Manager）でのみ保持し、
/// クライアントには平文で渡さない。クライアントはCallable Functions越しに命令するだけ。
abstract class CloudFunctionsMailProvider implements MailProvider {
  CloudFunctionsMailProvider({FirebaseFunctions? functions})
    : _functions = functions ?? FirebaseFunctions.instance;

  final FirebaseFunctions _functions;

  String get _providerKey => mailProviderTypeToString(providerType);

  @override
  Future<LinkedAccount> connect({required String userId}) async {
    final callable = _functions.httpsCallable('connectAccount');
    final result = await callable.call<Map<String, dynamic>>({
      'provider': _providerKey,
      'userId': userId,
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
    final callable = _functions.httpsCallable('fetchMessageBody');
    final result = await callable.call<Map<String, dynamic>>({
      'provider': _providerKey,
      'accountId': account.id,
      'messageId': messageId,
    });
    final data = Map<String, dynamic>.from(result.data as Map);
    return MessageBody(
      messageId: messageId,
      html: data['html'] as String? ?? '',
      attachmentNames: (data['attachmentNames'] as List<dynamic>? ?? [])
          .cast<String>(),
    );
  }
}

/// gmail.modify（Tier2） + gmail.labels（non-sensitive）のみ使用。
/// gmail.readonly（restricted）/ gmail.insert（restricted）は使用しない。
class GmailProvider extends CloudFunctionsMailProvider {
  GmailProvider({super.functions});

  @override
  MailProviderType get providerType => MailProviderType.gmail;
}

/// Microsoft Graph API Mail.ReadWrite（delegated、個人アカウント同意のみで完結）。
class OutlookProvider extends CloudFunctionsMailProvider {
  OutlookProvider({super.functions});

  @override
  MailProviderType get providerType => MailProviderType.outlook;
}

/// 標準IMAP/SMTP（Yahoo!メール・iCloud等）、アプリ専用パスワード方式。OAuth審査対象外。
class ImapProvider extends CloudFunctionsMailProvider {
  ImapProvider({super.functions});

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
