/// メール本文のローカルキャッシュ（24時間TTL）。
class MessageBodyCache {
  final String messageId;
  final String accountId;
  final String html;
  final List<String> attachmentNames;
  final DateTime cachedAt;
  final bool isCompressed;
  final int? originalSize;
  final int? compressedSize;

  const MessageBodyCache({
    required this.messageId,
    required this.accountId,
    required this.html,
    required this.attachmentNames,
    required this.cachedAt,
    this.isCompressed = false,
    this.originalSize,
    this.compressedSize,
  });

  /// キャッシュが有効（24時間以内）か判定。
  bool isValid(DateTime now) {
    final elapsedHours = now.difference(cachedAt).inHours;
    return elapsedHours < 24;
  }

  factory MessageBodyCache.fromMap(Map<String, dynamic> m) {
    return MessageBodyCache(
      messageId: m['messageId'] as String,
      accountId: m['accountId'] as String,
      html: m['html'] as String,
      attachmentNames: ((m['attachmentNames'] as String?) ?? '')
          .split(',')
          .where((s) => s.isNotEmpty)
          .toList(),
      cachedAt: DateTime.fromMillisecondsSinceEpoch(m['cachedAt'] as int),
      isCompressed: (m['isCompressed'] as int?) == 1,
      originalSize: m['originalSize'] as int?,
      compressedSize: m['compressedSize'] as int?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'messageId': messageId,
      'accountId': accountId,
      'html': html,
      'attachmentNames': attachmentNames.join(','),
      'cachedAt': cachedAt.millisecondsSinceEpoch,
      'isCompressed': isCompressed ? 1 : 0,
      'originalSize': originalSize,
      'compressedSize': compressedSize,
    };
  }
}

/// 添付ファイルリストのローカルキャッシュ（7日TTL）。
class AttachmentListCache {
  final String messageId;
  final String accountId;
  final List<String> attachmentNames;
  final DateTime cachedAt;

  const AttachmentListCache({
    required this.messageId,
    required this.accountId,
    required this.attachmentNames,
    required this.cachedAt,
  });

  /// キャッシュが有効（7日以内）か判定。
  bool isValid(DateTime now) {
    final elapsedDays = now.difference(cachedAt).inDays;
    return elapsedDays < 7;
  }

  factory AttachmentListCache.fromMap(Map<String, dynamic> m) {
    return AttachmentListCache(
      messageId: m['messageId'] as String,
      accountId: m['accountId'] as String,
      attachmentNames: ((m['attachmentNames'] as String?) ?? '')
          .split(',')
          .where((s) => s.isNotEmpty)
          .toList(),
      cachedAt: DateTime.fromMillisecondsSinceEpoch(m['cachedAt'] as int),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'messageId': messageId,
      'accountId': accountId,
      'attachmentNames': attachmentNames.join(','),
      'cachedAt': cachedAt.millisecondsSinceEpoch,
    };
  }
}
