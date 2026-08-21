import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/linked_account.dart';
import '../theme/app_theme.dart';
import '../viewmodels/core_providers.dart';
import '../viewmodels/linked_account_providers.dart';
import 'account_link_view.dart';
import 'paywall_view.dart';

class SettingsView extends ConsumerWidget {
  const SettingsView({super.key});

  Future<void> _unlinkAccount(
    BuildContext context,
    WidgetRef ref,
    LinkedAccount account,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('連携を解除しますか？'),
        content: Text(
          '${account.emailAddress} との連携を解除します。取得済みのメールデータは残りますが、'
          'スキャンやアーカイブ操作はできなくなります。',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('キャンセル'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('解除する'),
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
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextButton(
                          onPressed: () => _changeColor(context, ref, a),
                          child: Text(l10n.settingsAccountColor),
                        ),
                        IconButton(
                          icon: const Icon(Icons.link_off),
                          tooltip: '連携を解除',
                          onPressed: () => _unlinkAccount(context, ref, a),
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
