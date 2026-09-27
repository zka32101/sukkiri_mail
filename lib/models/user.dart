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

class AppUser {
  final String id;
  final UserPlan plan;
  final DateTime createdAt;
  /// 実Gmail等には一切書き込まず、アプリの一覧表示（emailMeta.localCacheStatus）
  /// からのみ経過日数で自動的に外すまでの日数。ユーザーがSettingsで指定する。
  final int localCacheRetentionDays;

  const AppUser({
    required this.id,
    required this.createdAt,
    this.plan = UserPlan.free,
    this.localCacheRetentionDays = kDefaultLocalCacheRetentionDays,
  });

  bool get isPro => plan == UserPlan.pro;

  AppUser copyWith({UserPlan? plan, int? localCacheRetentionDays}) {
    return AppUser(
      id: id,
      createdAt: createdAt,
      plan: plan ?? this.plan,
      localCacheRetentionDays:
          localCacheRetentionDays ?? this.localCacheRetentionDays,
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
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'plan': userPlanToString(plan),
      'createdAt': createdAt.millisecondsSinceEpoch,
      'localCacheRetentionDays': localCacheRetentionDays,
    };
  }
}
