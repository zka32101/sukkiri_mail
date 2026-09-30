enum UserPlan { free, pro }

UserPlan userPlanFromString(String? v) {
  switch (v) {
    case 'pro':
      return UserPlan.pro;
    case 'free':
    default:
      return UserPlan.free;
  }
}

String userPlanToString(UserPlan p) => p == UserPlan.pro ? 'pro' : 'free';

/// ローカル自動非表示のデフォルト日数。ユーザー未設定時（初回起動含む）に使う。
const int kDefaultLocalCacheRetentionDays = 30;

/// 自動再スキャン間隔のデフォルト（時間）。Cloud Functions側のデフォルトと一致させること。
const int kDefaultSyncIntervalHours = 1;

class AppUser {
  final String id;
  final UserPlan plan;
  final DateTime createdAt;
  /// 実Gmail等には一切書き込まず、アプリの一覧表示（emailMeta.localCacheStatus）
  /// からのみ経過日数で自動的に外すまでの日数。ユーザーがSettingsで指定する。
  final int localCacheRetentionDays;
  /// 新着メール通知（FCM）送信先トークン。端末単位で最後にログインした値のみ保持する
  /// 簡易実装（複数端末同時通知には非対応）。
  final String? fcmToken;
  /// 通知を送る対象の差出人アドレス一覧。空の場合は新着通知そのものを送らない
  /// （明示的に選んだ差出人のみ通知する設計、全件通知はしない）。
  final List<String> notifySenders;
  /// 自動再スキャン（新着メール取り込み）の間隔（時間）。Cloud Functions側の
  /// rescanAllAccountsは1時間おきに実行判定を行い、この間隔未満ならスキップする。
  final int syncIntervalHours;

  const AppUser({
    required this.id,
    required this.createdAt,
    this.plan = UserPlan.free,
    this.localCacheRetentionDays = kDefaultLocalCacheRetentionDays,
    this.fcmToken,
    this.notifySenders = const [],
    this.syncIntervalHours = kDefaultSyncIntervalHours,
  });

  bool get isPro => plan == UserPlan.pro;

  AppUser copyWith({
    UserPlan? plan,
    int? localCacheRetentionDays,
    String? fcmToken,
    List<String>? notifySenders,
    int? syncIntervalHours,
  }) {
    return AppUser(
      id: id,
      createdAt: createdAt,
      plan: plan ?? this.plan,
      localCacheRetentionDays:
          localCacheRetentionDays ?? this.localCacheRetentionDays,
      fcmToken: fcmToken ?? this.fcmToken,
      notifySenders: notifySenders ?? this.notifySenders,
      syncIntervalHours: syncIntervalHours ?? this.syncIntervalHours,
    );
  }

  factory AppUser.fromMap(String id, Map<String, dynamic> m) {
    return AppUser(
      id: id,
      plan: userPlanFromString(m['plan'] as String?),
      createdAt: m['createdAt'] is DateTime
          ? m['createdAt'] as DateTime
          : DateTime.fromMillisecondsSinceEpoch(
              (m['createdAt'] as num?)?.toInt() ?? 0,
            ),
      localCacheRetentionDays:
          (m['localCacheRetentionDays'] as num?)?.toInt() ??
              kDefaultLocalCacheRetentionDays,
      fcmToken: m['fcmToken'] as String?,
      notifySenders:
          (m['notifySenders'] as List?)?.map((e) => e as String).toList() ??
              const [],
      syncIntervalHours:
          (m['syncIntervalHours'] as num?)?.toInt() ??
              kDefaultSyncIntervalHours,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'plan': userPlanToString(plan),
      'createdAt': createdAt.millisecondsSinceEpoch,
      'localCacheRetentionDays': localCacheRetentionDays,
      if (fcmToken != null) 'fcmToken': fcmToken,
      'notifySenders': notifySenders,
      'syncIntervalHours': syncIntervalHours,
    };
  }
}
