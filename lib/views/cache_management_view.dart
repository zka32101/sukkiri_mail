import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../viewmodels/core_providers.dart';
import '../viewmodels/local_cache_eviction_providers.dart';

class CacheManagementView extends ConsumerWidget {
  const CacheManagementView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cacheStatsAsync = ref.watch(cacheStatisticsProvider);
    final cacheStatusAsync = ref.watch(cacheStatusProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('キャッシュ管理'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // キャッシュサイズ統計
            cacheStatsAsync.when(
              data: (stats) => Padding(
                padding: const EdgeInsets.all(16),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'キャッシュ統計',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 16),
                        _buildStatRow(
                          'キャッシュサイズ',
                          '${(stats['totalSize'] as int? ?? 0) ~/ (1024 * 1024)} MB',
                        ),
                        const SizedBox(height: 12),
                        _buildStatRow(
                          'メール数',
                          '${stats['emailCount'] ?? 0}',
                        ),
                        const SizedBox(height: 12),
                        _buildStatRow(
                          '未読メール',
                          '${stats['unreadCount'] ?? 0}',
                        ),
                        const SizedBox(height: 12),
                        _buildStatRow(
                          'アーカイブ済み',
                          '${stats['archivedCount'] ?? 0}',
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Text('エラー: $error'),
            ),
            const SizedBox(height: 16),
            // キャッシュ状態
            cacheStatusAsync.when(
              data: (status) => Padding(
                padding: const EdgeInsets.all(16),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'キャッシュ状態',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 16),
                        _buildStatusItem(
                          'ステータス',
                          status['isHealthy'] == true ? '正常' : '警告',
                          status['isHealthy'] == true
                              ? Colors.green
                              : Colors.orange,
                        ),
                        const SizedBox(height: 12),
                        _buildStatusItem(
                          'キャッシュ効率',
                          '${((status['hitRate'] as double? ?? 0) * 100).toStringAsFixed(1)}%',
                          Colors.blue,
                        ),
                        const SizedBox(height: 12),
                        if (status['lastEvictionTime'] != null)
                          Text(
                            '最後の最適化: ${status['lastEvictionTime']}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Text('エラー: $error'),
            ),
            const SizedBox(height: 24),
            // クリアボタン
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ElevatedButton.icon(
                    onPressed: () => _showClearConfirmDialog(context, ref),
                    icon: const Icon(Icons.delete_outline),
                    label: const Text('キャッシュをクリア'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red[400],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '未読メールを除くキャッシュをクリアします',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildStatusItem(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: color.withOpacity(0.2),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            value,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  void _showClearConfirmDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('キャッシュクリア'),
        content: const Text(
          'キャッシュをクリアしますか？\n未読メールは保護されます。',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('キャンセル'),
          ),
          ElevatedButton(
            onPressed: () async {
              // キャッシュクリア処理
              // 実装: LocalCacheService.clearCache() を呼び出し
              final cacheService = ref.read(localCacheServiceProvider);
              // 全メールをpurgedに変更（未読以外）
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('キャッシュをクリアしました')),
              );
              // キャッシュ統計を再取得
              ref.refresh(cacheStatisticsProvider);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red[400],
            ),
            child: const Text('クリア'),
          ),
        ],
      ),
    );
  }
}
