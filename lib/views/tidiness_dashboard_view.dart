import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../viewmodels/dashboard_providers.dart';
import '../viewmodels/linked_account_providers.dart';

/// 受信箱スッキリ度ダッシュボード：アーカイブ件数・実際に解放したローカル容量(MB)・保護件数。
class TidinessDashboardView extends ConsumerWidget {
  const TidinessDashboardView({super.key});

  String _formatBytes(int bytes) {
    final mb = bytes / (1024 * 1024);
    return '${mb.toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final statsAsync = ref.watch(tidinessStatsProvider);
    final accountsAsync = ref.watch(linkedAccountsProvider);
    final brightness = Theme.of(context).brightness;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.dashboardTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          statsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('$e'),
            data: (stats) => Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: l10n.dashboardArchivedCount,
                    value: '${stats.archivedCount}',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    label: l10n.dashboardFreedBytes,
                    value: _formatBytes(stats.freedBytes),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    label: l10n.dashboardPinnedCount,
                    value: '${stats.pinnedCount}',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text(l10n.settingsLinkedAccounts, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          accountsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('$e'),
            data: (accounts) => Column(
              children: accounts
                  .map((a) => ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppTheme.accountColorFor(a.colorHex, brightness),
                          child: Text(a.emailAddress.isNotEmpty ? a.emailAddress[0].toUpperCase() : '?'),
                        ),
                        title: Text(a.emailAddress),
                        subtitle: Text(a.provider.name),
                      ))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
