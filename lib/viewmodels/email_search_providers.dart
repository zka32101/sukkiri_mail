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
final mailSearchProvider =
    FutureProvider.family<List<EmailMeta>, MailSearchParams>((
      ref,
      params,
    ) async {
      if (params.query.trim().isEmpty) return [];
      final userId = await ref.watch(currentUserIdProvider.future);
      return ref
          .watch(emailMetaRepositoryProvider)
          .search(params.accountId, params.query, userId: userId);
    });

final archivedEmailsProvider = StreamProvider.family<List<EmailMeta>, String>((
  ref,
  accountId,
) {
  final userId = ref.watch(currentUserIdProvider).valueOrNull;
  if (userId == null) return const Stream.empty();
  return ref.watch(emailMetaRepositoryProvider).watchForAccount(
        accountId,
        userId: userId,
        status: EmailStatus.archived,
      );
});
