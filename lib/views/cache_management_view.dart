import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../viewmodels/local_cache_eviction_providers.dart';

/// キャッシュ管理UI - ローカルキャッシュの状態を可視化・管理
/// - キャッシュ統計情報（保持中のメール数、キャッシュサイズ推定値）
/// - キャッシュレベルインジケータ
/// - キャッシュをクリアボタン
class CacheManagementView extends ConsumerWidget {
  const CacheManagementView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // localCacheEvictionSweepProvider を監視して、キャッシュ削除の実行状況を把握
    final cacheEvictionAsync = ref.watch(localCacheEvictionSweepProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('キャッシュ管理'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // キャッシュ状態インジケータ
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'キャッシュ状態',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 16),
                    // キャッシュレベル表示
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('ストレージ使用量'),
                        Text(
                          '約 150 MB / 500 MB',
                          style: Theme.of(context).textTheme.labelMedium,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: 150 / 500,
                        minHeight: 8,
                        backgroundColor: Colors.grey[300],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getCacheColor(150 / 500),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // キャッシュメトリクス
                    Row(
                      children: [
                        Expanded(
                          child: _MetricCard(
                            label: 'キャッシュ済み',
                            value: '1,234',
                            icon: Icons.storage,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _MetricCard(
                            label: 'パージ済み',
                            value: '342',
                            icon: Icons.delete_outline,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _MetricCard(
                            label: 'ブロック済み',
                            value: '56',
                            icon: Icons.block,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // キャッシュ削除ルール
            Text(
              'キャッシュ削除ルール',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _RuleItem(
                      icon: Icons.block,
                      title: '差出人ブロック',
                      description: 'ブロック済みの差出人からのメールは自動キャッシュされません',
                    ),
                    const Divider(),
                    _RuleItem(
                      icon: Icons.star,
                      title: 'スター付きメール',
                      description: 'スター（ピン）を付けたメールは保持されます',
                    ),
                    const Divider(),
                    _RuleItem(
                      icon: Icons.mark_email_unread,
                      title: '未読メール',
                      description: '未読メールは削除日数の対象外です',
                    ),
                    const Divider(),
                    _RuleItem(
                      icon: Icons.category,
                      title: 'カテゴリ別保持期間',
                      description: 'ルール設定で各カテゴリの保持日数を指定できます',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // キャッシュ削除スケジュール
            Text(
              'キャッシュ削除スケジュール',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('自動削除'),
                        Switch(
                          value: true,
                          onChanged: (value) {},
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('実行間隔'),
                        DropdownButton<String>(
                          value: 'daily',
                          onChanged: (_) {},
                          items: const [
                            DropdownMenuItem(value: 'hourly', child: Text('1時間ごと')),
                            DropdownMenuItem(value: 'daily', child: Text('毎日')),
                            DropdownMenuItem(value: 'weekly', child: Text('毎週')),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // キャッシュをクリア
            cacheEvictionAsync.when(
              loading: () => SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: null,
                  icon: const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  label: const Text('キャッシュをクリア中...'),
                ),
              ),
              error: (_, __) => SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.warning),
                  label: const Text('キャッシュをクリア（エラー）'),
                ),
              ),
              data: (_) => SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _showClearCacheDialog(context),
                  icon: const Icon(Icons.delete_sweep),
                  label: const Text('今すぐキャッシュをクリア'),
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {},
                child: const Text('詳細情報を表示'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getCacheColor(double ratio) {
    if (ratio < 0.5) return Colors.green;
    if (ratio < 0.8) return Colors.orange;
    return Colors.red;
  }

  void _showClearCacheDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('キャッシュをクリア'),
        content: const Text(
          'ローカルキャッシュをクリアします。\n'
          'ネットワーク接続が必要になります。\n\n'
          '以下は削除されません：\n'
          '• スター付きのメール\n'
          '• 未読メール\n'
          '• ブロック済みの差出人',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('キャンセル'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('キャッシュをクリアしています...')),
              );
            },
            child: const Text('クリア'),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, size: 20, color: Colors.blue),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.blue,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _RuleItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _RuleItem({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.blue),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
