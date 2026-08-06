enum SenderMatchType { sender, domain }

SenderMatchType senderMatchTypeFromString(String v) {
  return v == 'domain' ? SenderMatchType.domain : SenderMatchType.sender;
}

String senderMatchTypeToString(SenderMatchType t) {
  return t == SenderMatchType.domain ? 'domain' : 'sender';
}

/// 差出人ブロック：指定した差出人/ドメインをそもそもローカルにキャッシュしない（既定で永続適用）。
/// アーカイブ有無に関わらず独立して効く（層1とは独立したルール）。
class SenderBlockRule {
  final String id;
  final String userId;
  final String? accountId; // null = 全アカウント共通
  final String pattern; // メールアドレス完全一致 or ドメイン（例: @xxx.co.jp）
  final SenderMatchType matchType;
  final DateTime createdAt;

  const SenderBlockRule({
    required this.id,
    required this.userId,
    required this.pattern,
    required this.matchType,
    required this.createdAt,
    this.accountId,
  });

  /// 指定した差出人アドレスがこのルールに一致するか判定。
  bool matches(String senderEmail) {
    final email = senderEmail.toLowerCase();
    final p = pattern.toLowerCase();
    if (matchType == SenderMatchType.sender) {
      return email == p;
    }
    final domain = p.startsWith('@') ? p : '@$p';
    return email.endsWith(domain);
  }

  factory SenderBlockRule.fromMap(String id, Map<String, dynamic> m) {
    return SenderBlockRule(
      id: id,
      userId: m['userId'] as String? ?? '',
      accountId: m['accountId'] as String?,
      pattern: m['pattern'] as String? ?? '',
      matchType: senderMatchTypeFromString(
        m['matchType'] as String? ?? 'sender',
      ),
      createdAt: m['createdAt'] is DateTime
          ? m['createdAt'] as DateTime
          : DateTime.fromMillisecondsSinceEpoch(
              (m['createdAt'] as num?)?.toInt() ?? 0,
            ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'accountId': accountId,
      'pattern': pattern,
      'matchType': senderMatchTypeToString(matchType),
      'createdAt': createdAt.millisecondsSinceEpoch,
    };
  }
}
