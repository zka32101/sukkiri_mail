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
import 'notification_settings_view.dart';
import 'paywall_view.dart';
import 'usage_guide_view.dart';

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
    try {
      await ref
          .read(linkedAccountRepositoryProvider)
          .updateColor(account.id, picked);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _confirmUnlink(
    BuildContext context,
    WidgetRef ref,
    LinkedAccount account,
  ) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(l10n.settingsAccountUnlinkConfirm(account.emailAddress)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(l10n.commonConfirm),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(linkedAccountRepositoryProvider).remove(account.id);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _changeSyncInterval(
    BuildContext context,
    WidgetRef ref,
    int current,
  ) async {
    const options = [1, 3, 6, 12, 24];
    final picked = await showDialog<int>(
      context: context,
      builder: (context) => SimpleDialog(
        title: Text(AppLocalizations.of(context)!.settingsSyncInterval),
        children: options
            .map(
              (h) => RadioListTile<int>(
                value: h,
                groupValue: current,
                title: Text(
                  AppLocalizations.of(context)!.settingsSyncIntervalHours(h),
                ),
                onChanged: (v) => Navigator.pop(context, v),
              ),
            )
            .toList(),
      ),
    );
    if (picked == null) return;
    final userId = await ref.read(currentUserIdProvider.future);
    await ref.read(userRepositoryProvider).setSyncIntervalHours(userId, picked);
    ref.invalidate(currentAppUserProvider);
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
                  (a) => Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 4,
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AppTheme.accountColorFor(
                            a.colorHex,
                            brightness,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                a.emailAddress,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                a.oauthStatus == 'expired'
                                    ? l10n.settingsAccountReauthRequired
                                    : a.provider.name,
                                style: a.oauthStatus == 'expired'
                                    ? TextStyle(
                                        color: Theme.of(
                                          context,
                                        ).colorScheme.error,
                                      )
                                    : Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.palette_outlined),
                          tooltip: l10n.settingsAccountColor,
                          onPressed: () => _changeColor(context, ref, a),
                        ),
                        IconButton(
                          icon: const Icon(Icons.link_off),
                          tooltip: l10n.settingsAccountUnlink,
                          onPressed: () => _confirmUnlink(context, ref, a),
                        ),
                      ],
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
          Consumer(
            builder: (context, ref, _) {
              final userAsync = ref.watch(currentAppUserProvider);
              final hours =
                  userAsync.valueOrNull?.syncIntervalHours ??
                      kDefaultSyncIntervalHours;
              return ListTile(
                title: Text(l10n.settingsSyncInterval),
                subtitle: Text(l10n.settingsSyncIntervalHours(hours)),
                onTap: () => _changeSyncInterval(context, ref, hours),
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
          const Divider(),
          ListTile(
            leading: const Icon(Icons.notifications_outlined),
            title: Text(l10n.notificationSettingsTitle),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => const NotificationSettingsView(),
              ),
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.help_outline),
            title: Text(l10n.settingsUsageGuide),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const UsageGuideView()),
            ),
          ),
        ],
      ),
    );
  }
}
