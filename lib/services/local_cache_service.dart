import '../models/email_meta.dart';
import '../models/message_cache.dart';
import '../models/sender_block_rule.dart';
import 'device_storage_service.dart';
import 'message_cache_db.dart';

/// 端末ローカルの本文/添付キャッシュ管理（クライアント側のみで完結、サーバーAPI呼び出し不要）。
///
/// ルール適用順序を厳守（引き継ぎ書の最重要ガード条件）：
///   ①SenderBlockRule（最優先・そもそも自動キャッシュしない。ピン留めより優先）
///   ②isPinned（保護・削除しない）
///   ③時間経過による自動パージ（未読でない・保護されていない・経過日数）
///
/// メタデータ・スニペットはどの状態でも常に保持し検索可能（この判定の対象外）。
///
/// 別途、メール本文（24時間TTL）と添付ファイルリスト（7日TTL）をSQLiteに保存。
/// fetchMessageBody() 呼び出し前にキャッシュを確認、有効なら API 呼び出しをスキップ。
class LocalCacheService {
  final MessageCacheDb _db;
  final DeviceStorageService _storageService;

  LocalCacheService({
    MessageCacheDb? cacheDb,
    DeviceStorageService? storageService,
  })  : _db = cacheDb ?? MessageCacheDb(),
        _storageService = storageService ?? DeviceStorageService();
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

  /// メール本文をキャッシュに保存（24時間TTL）。
  /// Cloud Functions の fetchMessageBody() 呼び出し後、本文を保存する。
  /// ストレージ容量が不足している場合は、自動的に古いキャッシュを削除。
  Future<void> cacheMessageBody({
    required String messageId,
    required String accountId,
    required String html,
    required List<String> attachmentNames,
    required bool isCompressed,
    int? originalSize,
    int? compressedSize,
  }) async {
    // ストレージ容量をチェック
    if (await _storageService.isStorageWarning()) {
      // 警告レベル：期限切れキャッシュを削除
      await cleanupExpiredMessageCaches();
    }

    if (await _storageService.isStorageCritical()) {
      // 危機的状況：古いキャッシュを削除（容量が空くまで）
      await _deleteOldestCachesUntilAvailable();
    }

    final cache = MessageBodyCache(
      messageId: messageId,
      accountId: accountId,
      html: html,
      attachmentNames: attachmentNames,
      cachedAt: DateTime.now(),
      isCompressed: isCompressed,
      originalSize: originalSize,
      compressedSize: compressedSize,
    );
    await _db.cacheMessageBody(cache);
  }

  /// メール本文をキャッシュから取得。
  /// 有効（24時間以内）なキャッシュがあれば返す。期限切れなら削除して null を返す。
  /// fetchMessageBody() 前に呼び出して、キャッシュヒット時は Cloud Functions 呼び出しをスキップ。
  Future<MessageBodyCache?> getMessageBodyCache(
    String messageId,
    String accountId,
  ) async {
    return await _db.getMessageBodyCache(messageId, accountId);
  }

  /// 期限切れ（24時間以上前）のメール本文キャッシュを一括削除。
  /// バックグラウンドタスクや定期クリーンアップで呼び出す。
  /// 戻り値: 削除されたキャッシュ件数。
  Future<int> cleanupExpiredMessageCaches() async {
    return await _db.deleteExpiredMessageBodyCaches();
  }

  /// 全メール本文キャッシュを削除。
  /// アプリ設定リセットやログアウト時に使用。
  Future<int> clearAllMessageCaches() async {
    return await _db.deleteAllMessageCaches();
  }

  /// キャッシュサイズ統計を取得。
  /// キャッシュ件数とストレージ使用量（byte）を返す。
  /// ダッシュボード画面で「キャッシュサイズ」と「解放可能容量」を表示する場合に使用。
  Future<Map<String, int>> getMessageCacheStats() async {
    return await _db.getCacheStats();
  }

  /// ストレージ容量が十分になるまで古いキャッシュを段階的に削除。
  /// 推奨キャッシュサイズを下回るまで削除を続ける。
  Future<int> _deleteOldestCachesUntilAvailable() async {
    int deletedCount = 0;
    final recommendedSize = await _storageService.getRecommendedCacheSizeBytes();

    while (await _storageService.isStorageCritical()) {
      final stats = await getMessageCacheStats();
      final currentSize = (stats['totalBytes'] ?? 0) as int;

      if (currentSize <= recommendedSize) {
        break; // 推奨サイズ以下になったら終了
      }

      // 最も古いキャッシュ1件を削除
      final deleted = await _db.deleteOldestMessageCache();
      if (deleted == 0) {
        break; // 削除する対象がない
      }

      deletedCount += deleted;

      // 連続削除は避けるため、少し待機
      await Future.delayed(const Duration(milliseconds: 100));
    }

    return deletedCount;
  }

  /// デバイスストレージの状態を取得（UI表示用）
  Future<StorageStatus> getStorageStatus() async {
    final isCritical = await _storageService.isStorageCritical();
    final isWarning = await _storageService.isStorageWarning();

    if (isCritical) {
      return StorageStatus.critical;
    } else if (isWarning) {
      return StorageStatus.warning;
    }
    return StorageStatus.normal;
  }
}

/// ストレージの状態
enum StorageStatus {
  normal, // 正常
  warning, // 警告（15%未満）
  critical, // 危機的（5%未満）
}
