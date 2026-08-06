import 'category_rule.dart';

enum EmailStatus { active, archived, restored }

EmailStatus emailStatusFromString(String v) {
  switch (v) {
    case 'archived':
      return EmailStatus.archived;
    case 'restored':
      return EmailStatus.restored;
    case 'active':
    default:
      return EmailStatus.active;
  }
}

String emailStatusToString(EmailStatus s) {
  switch (s) {
    case EmailStatus.archived:
      return 'archived';
    case EmailStatus.restored:
      return 'restored';
    case EmailStatus.active:
      return 'active';
  }
}

/// ローカルキャッシュ保持状態。blocked = 差出人ブロックによりそもそも自動キャッシュしない。
enum LocalCacheStatus { cached, purged, blocked }

LocalCacheStatus localCacheStatusFromString(String v) {
  switch (v) {
    case 'purged':
      return LocalCacheStatus.purged;
    case 'blocked':
      return LocalCacheStatus.blocked;
    case 'cached':
    default:
      return LocalCacheStatus.cached;
  }
}

String localCacheStatusToString(LocalCacheStatus s) {
  switch (s) {
    case LocalCacheStatus.purged:
      return 'purged';
    case LocalCacheStatus.blocked:
      return 'blocked';
    case LocalCacheStatus.cached:
      return 'cached';
  }
}

class EmailMeta {
  final String id;
  final String accountId;
  final MailCategory category;
  final DateTime receivedAt;
  final bool hasAttachment;
  final EmailStatus status;
  final bool isPinned; // スワイプ保護。自動アーカイブ・自動キャッシュ削除の両方から除外（最優先ガード）
  final LocalCacheStatus localCacheStatus;
  final String snippet; // 常時保持・数十文字。キャッシュ削除後も検索・一覧表示に使う
  final DateTime? lastFetchedAt; // オンデマンド取得の最終日時

  const EmailMeta({
    required this.id,
    required this.accountId,
    required this.category,
    required this.receivedAt,
    required this.snippet,
    this.hasAttachment = false,
    this.status = EmailStatus.active,
    this.isPinned = false,
    this.localCacheStatus = LocalCacheStatus.cached,
    this.lastFetchedAt,
  });

  EmailMeta copyWith({
    EmailStatus? status,
    bool? isPinned,
    LocalCacheStatus? localCacheStatus,
    DateTime? lastFetchedAt,
  }) {
    return EmailMeta(
      id: id,
      accountId: accountId,
      category: category,
      receivedAt: receivedAt,
      hasAttachment: hasAttachment,
      snippet: snippet,
      status: status ?? this.status,
      isPinned: isPinned ?? this.isPinned,
      localCacheStatus: localCacheStatus ?? this.localCacheStatus,
      lastFetchedAt: lastFetchedAt ?? this.lastFetchedAt,
    );
  }

  factory EmailMeta.fromMap(String id, Map<String, dynamic> m) {
    return EmailMeta(
      id: id,
      accountId: m['accountId'] as String? ?? '',
      category: mailCategoryFromString(m['category'] as String? ?? 'promotion'),
      receivedAt: m['receivedAt'] is DateTime
          ? m['receivedAt'] as DateTime
          : DateTime.fromMillisecondsSinceEpoch(
              (m['receivedAt'] as num?)?.toInt() ?? 0,
            ),
      hasAttachment: m['hasAttachment'] as bool? ?? false,
      status: emailStatusFromString(m['status'] as String? ?? 'active'),
      isPinned: m['isPinned'] as bool? ?? false,
      localCacheStatus: localCacheStatusFromString(
        m['localCacheStatus'] as String? ?? 'cached',
      ),
      snippet: m['snippet'] as String? ?? '',
      lastFetchedAt: m['lastFetchedAt'] == null
          ? null
          : (m['lastFetchedAt'] is DateTime
                ? m['lastFetchedAt'] as DateTime
                : DateTime.fromMillisecondsSinceEpoch(
                    (m['lastFetchedAt'] as num).toInt(),
                  )),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'accountId': accountId,
      'category': mailCategoryToString(category),
      'receivedAt': receivedAt.millisecondsSinceEpoch,
      'hasAttachment': hasAttachment,
      'status': emailStatusToString(status),
      'isPinned': isPinned,
      'localCacheStatus': localCacheStatusToString(localCacheStatus),
      'snippet': snippet,
      'lastFetchedAt': lastFetchedAt?.millisecondsSinceEpoch,
    };
  }
}
