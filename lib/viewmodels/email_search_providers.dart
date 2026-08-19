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
