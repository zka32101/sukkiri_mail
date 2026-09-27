import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/linked_account.dart';
import '../models/user.dart';
import '../theme/app_theme.dart';
import '../viewmodels/app_user_providers.dart';
import '../viewmodels/auth_provider.dart';
import '../viewmodels/core_providers.dart';
import '../viewmodels/linked_account_providers.dart';
import 'account_link_view.dart';
import 'paywall_view.dart';

class SettingsView extends ConsumerWidget {
  Future<void> _changeRetentionDays(
    BuildContext context,
    WidgetRef ref,
    int current,
  ) async {
    int days = current;
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('自動非表示までの日数'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Slider(
                value: days.toDouble(),
                min: 1,
                max: 365,
                divisions: 364,
                label: '$days日',
                onChanged: (v) => setDialogState(() => days = v.round()),
              ),
              Text('$days日'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('キャンセル'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('決定'),
            ),
          ],
        ),
      ),
    );
    if (result != true) return;
    final userId = await ref.read(currentUserIdProvider.future);
    await ref
        .read(userRepositoryProvider)
        .setLocalCacheRetentionDays(userId, days);
    ref.invalidate(currentAppUserProvider);
  }

  const SettingsView({super.key});

  Future<void> _changeColor(
    BuildContext context,
    WidgetRef ref,
    LinkedAccount account,
  ) async {
    final brightness = Theme.of(context).brightness;
    final picked = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('カラーを選択'),
        children: kAccountColorPalette
            .map(
              (hex) => SimpleDialogOption(
                onPressed: () => Navigator.pop(context, hex),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 10,
                      backgroundColor: AppTheme.accountColorFor(
                        hex,
                        brightness,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(hex),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
    if (picked == null) return;
    await ref
        .read(linkedAccountRepositoryProvider)
        .updateColor(account.id, picked);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final accountsAsync = ref.watch(linkedAccountsProvider);
    final brightness = Theme.of(context).brightness;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.settingsTitle)),
      body: ListView(
        children: [
          ListTile(
            title: Text(l10n.settingsLinkedAccounts),
            subtitle: const Divider(),
          ),
          accountsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('$e'),
            data: (accounts) => Column(
              children: [
                ...accounts.map(
                  (a) => ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.accountColorFor(
                        a.colorHex,
                        brightness,
                      ),
                    ),
                    title: Text(a.emailAddress),
                    subtitle: Text(a.provider.name),
                    trailing: TextButton(
                      onPressed: () => _changeColor(context, ref, a),
                      child: Text(l10n.settingsAccountColor),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.add),
                  title: const Text('アカウントを追加'),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const AccountLinkView()),
                  ),
                ),
              ],
            ),
          ),
          const Divider(),
          Consumer(
            builder: (context, ref, _) {
              final userAsync = ref.watch(currentAppUserProvider);
              final days =
                  userAsync.valueOrNull?.localCacheRetentionDays ??
                      kDefaultLocalCacheRetentionDays;
              return ListTile(
                title: Text(l10n.settingsLocalCacheRetention),
                subtitle: Text(
                  '$days日 ・ ${l10n.settingsLocalCacheRetentionDescription}',
                ),
                onTap: () => _changeRetentionDays(context, ref, days),
              );
            },
          ),
          const Divider(),
          ListTile(
            title: Text(l10n.settingsPlan),
            trailing: FilledButton(
              onPressed: () => Navigator.of(
                context,
              ).push(MaterialPageRoute(builder: (_) => const PaywallView())),
              child: Text(l10n.paywallCta),
            ),
          ),
        ],
      ),
    );
  }
}
