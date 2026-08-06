/// ダッシュボードの「実際に解放したローカル容量(MB)」表示用ログ。
/// サーバー側データには影響しない（クライアントローカルの物理削除記録）。
class CacheEvictionLog {
  final String id;
  final String userId;
  final DateTime purgedAt;
  final int emailCount;
  final int freedBytesEstimate;

  const CacheEvictionLog({
    required this.id,
    required this.userId,
    required this.purgedAt,
    required this.emailCount,
    required this.freedBytesEstimate,
  });

  factory CacheEvictionLog.fromMap(String id, Map<String, dynamic> m) {
    return CacheEvictionLog(
      id: id,
      userId: m['userId'] as String? ?? '',
      purgedAt: m['purgedAt'] is DateTime
          ? m['purgedAt'] as DateTime
          : DateTime.fromMillisecondsSinceEpoch(
              (m['purgedAt'] as num?)?.toInt() ?? 0,
            ),
      emailCount: (m['emailCount'] as num?)?.toInt() ?? 0,
      freedBytesEstimate: (m['freedBytesEstimate'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'purgedAt': purgedAt.millisecondsSinceEpoch,
      'emailCount': emailCount,
      'freedBytesEstimate': freedBytesEstimate,
    };
  }
}
