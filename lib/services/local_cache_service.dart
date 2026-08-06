import '../models/email_meta.dart';
import '../models/sender_block_rule.dart';

/// 端末ローカルの本文/添付キャッシュ管理（クライアント側のみで完結、サーバーAPI呼び出し不要）。
///
/// ルール適用順序を厳守（引き継ぎ書の最重要ガード条件）：
///   ①SenderBlockRule（最優先・そもそも自動キャッシュしない。ピン留めより優先）
///   ②isPinned（保護・削除しない）
///   ③時間経過による自動パージ（未読でない・保護されていない・経過日数）
///
/// メタデータ・スニペットはどの状態でも常に保持し検索可能（この判定の対象外）。
class LocalCacheService {
  /// 1件のメールについて、次に取るべき localCacheStatus を決定する。
  /// [isUnread] が true の間は自動パージ対象にしない（未読メールは経過日数によらず保持）。
  LocalCacheStatus determineStatus({
    required EmailMeta meta,
    required String senderEmail,
    required List<SenderBlockRule> blockRules,
    required int retentionDays,
    required DateTime now,
    bool isUnread = false,
  }) {
    // ①差出人ブロック：最優先。ピン留めより優先し、そもそも自動キャッシュしない。
    final blocked = blockRules.any((r) => r.matches(senderEmail));
    if (blocked) {
      return LocalCacheStatus.blocked;
    }

    // ②ピン留め：保護され、削除しない。
    if (meta.isPinned) {
      return LocalCacheStatus.cached;
    }

    // 未読は経過日数によらず保持。
    if (isUnread) {
      return LocalCacheStatus.cached;
    }

    // ③時間経過による自動パージ。
    final elapsedDays = now.difference(meta.receivedAt).inDays;
    if (elapsedDays >= retentionDays) {
      return LocalCacheStatus.purged;
    }
    return LocalCacheStatus.cached;
  }

  /// 複数件をまとめて判定し、状態が変化するものだけ返す（差分適用用）。
  List<EmailMeta> planEviction({
    required List<EmailMeta> metas,
    required Map<String, String> senderEmailByMetaId,
    required List<SenderBlockRule> blockRules,
    required int retentionDays,
    required DateTime now,
    Set<String> unreadMetaIds = const {},
  }) {
    final changed = <EmailMeta>[];
    for (final meta in metas) {
      final sender = senderEmailByMetaId[meta.id] ?? '';
      final next = determineStatus(
        meta: meta,
        senderEmail: sender,
        blockRules: blockRules,
        retentionDays: retentionDays,
        now: now,
        isUnread: unreadMetaIds.contains(meta.id),
      );
      if (next != meta.localCacheStatus) {
        changed.add(meta.copyWith(localCacheStatus: next));
      }
    }
    return changed;
  }

  /// パージ対象件数から、ダッシュボード表示用の推定解放容量(byte)を概算する。
  /// 実測ではなく概算のため freedBytesEstimate という名称（CacheEvictionLog側の命名と一致）。
  int estimateFreedBytes({
    required int emailCount,
    int avgBytesPerEmail = 150 * 1024,
  }) {
    return emailCount * avgBytesPerEmail;
  }
}
