import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/category_rule.dart';
import '../models/email_meta.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

/// メール一覧画面の並び替え順。
enum MailListSortOrder { newest, unreadFirst, sender }

class MailListParams {
  final String accountId;
  final MailCategory? category; // null = すべてのカテゴリ

  const MailListParams({required this.accountId, this.category});

  @override
  bool operator ==(Object other) =>
      other is MailListParams &&
      other.accountId == accountId &&
      other.category == category;

  @override
  int get hashCode => Object.hash(accountId, category);
}

/// アクティブな（未アーカイブの）メール一覧。一覧画面のメインデータソース。
/// カテゴリはFirestoreクエリ側で絞り込む（件数が多くなり得るため）。
/// autoDisposeにより、画面を離れて誰も参照しなくなったFirestoreの
/// リアルタイムリスナーが確実に解放される。
final activeMailsProvider =
    StreamProvider.autoDispose.family<List<EmailMeta>, MailListParams>((
      ref,
      params,
    ) async* {
      final userId = await ref.watch(currentUserIdProvider.future);
      yield* ref
          .watch(emailMetaRepositoryProvider)
          .watchForAccount(
            params.accountId,
            userId,
            status: EmailStatus.active,
            category: params.category,
          );
    });

/// 並び替えを適用した新しいリストを返す（元のリストは変更しない）。
/// 件数はアーカイブ前提のアプリの性質上多くないため、クライアント側でのソートで十分とする。
List<EmailMeta> sortMails(List<EmailMeta> mails, MailListSortOrder order) {
  final sorted = [...mails];
  switch (order) {
    case MailListSortOrder.newest:
      sorted.sort((a, b) => b.receivedAt.compareTo(a.receivedAt));
      break;
    case MailListSortOrder.unreadFirst:
      sorted.sort((a, b) {
        if (a.isUnread != b.isUnread) {
          return a.isUnread ? -1 : 1;
        }
        return b.receivedAt.compareTo(a.receivedAt);
      });
      break;
    case MailListSortOrder.sender:
      sorted.sort((a, b) {
        final senderCompare = a.senderEmail.compareTo(b.senderEmail);
        if (senderCompare != 0) return senderCompare;
        return b.receivedAt.compareTo(a.receivedAt);
      });
      break;
  }
  return sorted;
}

/// 送信者（メールアドレス）ごとにグルーピングする。
/// 表示順は各グループ内の最新メール受信日時の降順。
/// キーが空文字列（送信者不明）の場合の文言変換はUI側（l10n）で行う。
Map<String, List<EmailMeta>> groupBySender(List<EmailMeta> mails) {
  final groups = <String, List<EmailMeta>>{};
  for (final mail in mails) {
    groups.putIfAbsent(mail.senderEmail, () => []).add(mail);
  }
  final sortedEntries = groups.entries.toList()
    ..sort((a, b) {
      final aLatest = a.value
          .map((m) => m.receivedAt)
          .reduce((x, y) => x.isAfter(y) ? x : y);
      final bLatest = b.value
          .map((m) => m.receivedAt)
          .reduce((x, y) => x.isAfter(y) ? x : y);
      return bLatest.compareTo(aLatest);
    });
  return {for (final e in sortedEntries) e.key: e.value};
}
