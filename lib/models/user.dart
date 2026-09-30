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

class AppUser {
  final String id;
  final UserPlan plan;
  final DateTime createdAt;

  const AppUser({
    required this.id,
    required this.createdAt,
    this.plan = UserPlan.free,
  });

  bool get isPro => plan == UserPlan.pro;

  AppUser copyWith({UserPlan? plan}) {
    return AppUser(id: id, createdAt: createdAt, plan: plan ?? this.plan);
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
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'plan': userPlanToString(plan),
      'createdAt': createdAt.millisecondsSinceEpoch,
    };
  }
}
