import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/email_meta.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

class MailSearchParams {
  final String accountId;
  final String query;

  const MailSearchParams({required this.accountId, required this.query});

  @override
  bool operator ==(Object other) =>
      other is MailSearchParams &&
      other.accountId == accountId &&
      other.query == query;

  @override
  int get hashCode => Object.hash(accountId, query);
}

/// メタデータは常時検索可能（本文がローカルパージ済みでも検索できる）。
/// autoDisposeにより、検索クエリ文字列ごとに増え続けるキャッシュエントリを
/// 画面を離れたタイミングで解放する。
final mailSearchProvider =
    FutureProvider.autoDispose.family<List<EmailMeta>, MailSearchParams>((
      ref,
      params,
    ) async {
      if (params.query.trim().isEmpty) return [];
      final userId = await ref.watch(currentUserIdProvider.future);
      return ref
          .watch(emailMetaRepositoryProvider)
          .search(params.accountId, userId, params.query);
    });

/// autoDisposeにより、この画面を離れて誰も参照しなくなったFirestoreの
/// リアルタイムリスナーが確実に解放される（非autoDisposeだと、アカウントを
/// 切り替えるたびにリスナーが増え続け、アプリプロセスが生きている限り
/// 購読され続けてしまう）。
final archivedEmailsProvider =
    StreamProvider.autoDispose.family<List<EmailMeta>, String>((
      ref,
      accountId,
    ) async* {
      final userId = await ref.watch(currentUserIdProvider.future);
      yield* ref
          .watch(emailMetaRepositoryProvider)
          .watchForAccount(accountId, userId, status: EmailStatus.archived);
    });

/// 複合条件での Email 検索（件名、送信者、本文など）。
/// 全アカウントを対象に検索し、searchField で検索対象を制限する。
final searchEmailsProvider =
    FutureProvider.autoDispose.family<List<EmailMeta>, EmailSearchParams>((
      ref,
      params,
    ) async {
      if (params.query.trim().isEmpty) return [];

      final userId = await ref.watch(currentUserIdProvider.future);
      final accounts = await ref.watch(linkedAccountsProvider.future);

      final emailMetaRepo = ref.watch(emailMetaRepositoryProvider);
      final allResults = <EmailMeta>[];

      for (final account in accounts) {
        final metas = await emailMetaRepo
            .watchForAccount(account.id, userId)
            .first;

        final filtered = metas.where((email) {
          final query = params.query.toLowerCase();
          switch (params.searchField) {
            case 'sender':
              return email.senderEmail.toLowerCase().contains(query);
            case 'body':
              return email.snippet.toLowerCase().contains(query);
            default: // 'all'
              return email.senderEmail.toLowerCase().contains(query) ||
                  email.snippet.toLowerCase().contains(query);
          }
        }).toList();

        allResults.addAll(filtered);
      }

      // 最新順に並び替え
      allResults.sort((a, b) => b.receivedAt.compareTo(a.receivedAt));
      return allResults;
    });
