import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../viewmodels/app_user_providers.dart';
import '../viewmodels/auth_provider.dart';
import '../viewmodels/core_providers.dart';
import '../viewmodels/rule_providers.dart';

/// 通知を送る対象の差出人を選ぶ画面。knownSendersProvider（これまでに取り込まれた
/// 差出人一覧）からチェックボックスで選択し、AppUser.notifySendersへ保存する。
/// 空リストのまま＝新着通知を送らない（全件通知はしないという設計）。
class NotificationSettingsView extends ConsumerWidget {
  const NotificationSettingsView({super.key});

  Future<void> _toggle(
    WidgetRef ref,
    List<String> current,
    String sender,
    bool selected,
  ) async {
    final userId = await ref.read(currentUserIdProvider.future);
    final updated = List<String>.from(current);
    if (selected) {
      if (!updated.contains(sender)) updated.add(sender);
    } else {
      updated.remove(sender);
    }
    await ref.read(userRepositoryProvider).setNotifySenders(userId, updated);
    ref.invalidate(currentAppUserProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final knownSendersAsync = ref.watch(knownSendersProvider);
    final appUserAsync = ref.watch(currentAppUserProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.notificationSettingsTitle)),
      body: knownSendersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (senders) {
          if (senders.isEmpty) {
            return Center(child: Text(l10n.notificationSettingsEmpty));
          }
          final notifySenders = appUserAsync.value?.notifySenders ?? const [];
          return ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  l10n.notificationSettingsDescription,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
              for (final sender in senders)
                CheckboxListTile(
                  title: Text(sender),
                  value: notifySenders.contains(sender),
                  onChanged: (checked) => _toggle(
                    ref,
                    notifySenders,
                    sender,
                    checked ?? false,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
