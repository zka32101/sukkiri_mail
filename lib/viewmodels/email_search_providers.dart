import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/email_meta.dart';
import 'core_providers.dart';

class MailSearchParams {
  final String accountId;
  final String query;

  const MailSearchParams({required this.accountId, required this.query});

  @override
  bool operator ==(Object other) =>
      other is MailSearchParams && other.accountId == accountId && other.query == query;

  @override
  int get hashCode => Object.hash(accountId, query);
}

/// メタデータは常時検索可能（本文がローカルパージ済みでも検索できる）。
final mailSearchProvider =
    FutureProvider.family<List<EmailMeta>, MailSearchParams>((ref, params) async {
  if (params.query.trim().isEmpty) return [];
  return ref.watch(emailMetaRepositoryProvider).search(params.accountId, params.query);
});

final archivedEmailsProvider =
    StreamProvider.family<List<EmailMeta>, String>((ref, accountId) {
  return ref
      .watch(emailMetaRepositoryProvider)
      .watchForAccount(accountId, status: EmailStatus.archived);
});
