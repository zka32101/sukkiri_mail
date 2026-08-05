import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_provider.dart';
import 'core_providers.dart';

class TidinessStats {
  final int archivedCount;
  final int freedBytes;
  final int pinnedCount;

  const TidinessStats({
    required this.archivedCount,
    required this.freedBytes,
    required this.pinnedCount,
  });
}

/// 受信箱スッキリ度ダッシュボード：アーカイブ件数・実際に解放したローカル容量(MB)・保護件数。
/// 「容量」訴求はローカルキャッシュ解放分のみ（サーバー側のアーカイブ件数と混同しない）。
final tidinessStatsProvider = FutureProvider<TidinessStats>((ref) async {
  final userId = await ref.watch(currentUserIdProvider.future);
  final archivedCount = await ref.watch(archiveLogRepositoryProvider).totalArchivedCount(userId);
  final freedBytes = await ref.watch(cacheEvictionLogRepositoryProvider).totalFreedBytes(userId);
  // pinnedCountはアカウント横断で集計が必要なため、Cloud Functions側の集計APIに置き換え可能な
  // 設計にしておく（MVPではローカル集計プレースホルダー）。
  const pinnedCount = 0;
  return TidinessStats(
    archivedCount: archivedCount,
    freedBytes: freedBytes,
    pinnedCount: pinnedCount,
  );
});
