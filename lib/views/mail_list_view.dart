import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/email_meta.dart';
import '../models/linked_account.dart';
import '../theme/app_theme.dart';
import '../viewmodels/core_providers.dart';
import '../viewmodels/email_list_providers.dart';
import '../viewmodels/linked_account_providers.dart';
import 'account_link_view.dart';

/// アプリ起動時に最初に表示する画面。実Gmail等の状態には触れず、
/// 「今アプリに見えるべきメール」（=ローカル自動非表示（localCacheStatus=purged）
/// になっていないもの）だけを一覧表示する。
/// アカウント未連携でもこの画面自体は表示され（Onboardingの必須ゲートは廃止）、
/// 連携はここまたはSettingsタブからいつでも行える。
class MailListView extends ConsumerWidget {
  const MailListView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final accounts = ref.watch(linkedAccountsProvider).valueOrNull ?? [];
    final brightness = Theme.of(context).brightness;

    if (accounts.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.mailListTitle)),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.mail_outline, size: 48),
                const SizedBox(height: 16),
                Text(
                  l10n.mailListEmpty,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const AccountLinkView(),
                    ),
                  ),
                  child: Text(l10n.settingsLinkedAccounts),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(l10n.mailListTitle)),
      body: ListView(
        children: accounts
            .expand(
              (account) => _AccountEmailSection(
                account: account,
                brightness: brightness,
              ).buildTiles(context, ref),
            )
            .toList(),
      ),
    );
  }
}

class _AccountEmailSection {
  _AccountEmailSection({required this.account, required this.brightness});

  final LinkedAccount account;
  final Brightness brightness;

  List<Widget> buildTiles(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final emailsAsync = ref.watch(visibleEmailsProvider(account.id));

    return [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
        child: Row(
          children: [
            CircleAvatar(
              radius: 6,
              backgroundColor:
                  AppTheme.accountColorFor(account.colorHex, brightness),
            ),
            const SizedBox(width: 8),
            Text(
              account.emailAddress,
              style: Theme.of(context).textTheme.labelLarge,
            ),
          ],
        ),
      ),
      emailsAsync.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: LinearProgressIndicator(),
        ),
        error: (e, _) => Padding(
          padding: const EdgeInsets.all(16),
          child: Text('$e'),
        ),
        data: (metas) {
          if (metas.isEmpty) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                l10n.mailListEmpty,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            );
          }
          final sorted = [...metas]
            ..sort((a, b) => b.receivedAt.compareTo(a.receivedAt));
          return Column(
            children: sorted
                .map((meta) => _EmailTile(meta: meta, l10n: l10n, ref: ref))
                .toList(),
          );
        },
      ),
      const Divider(height: 24),
    ];
  }
}

class _EmailTile extends StatelessWidget {
  const _EmailTile({required this.meta, required this.l10n, required this.ref});

  final EmailMeta meta;
  final AppLocalizations l10n;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(
        meta.snippet.isEmpty ? '(no subject)' : meta.snippet,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(_formatDate(meta.receivedAt)),
      trailing: IconButton(
        icon: Icon(meta.isPinned ? Icons.push_pin : Icons.push_pin_outlined),
        tooltip:
            meta.isPinned ? l10n.mailListPinToggleOff : l10n.mailListPinToggleOn,
        onPressed: () => ref
            .read(emailMetaRepositoryProvider)
            .setPinned(meta.id, !meta.isPinned),
      ),
    );
  }

  static String _twoDigits(int n) => n.toString().padLeft(2, '0');

  String _formatDate(DateTime d) {
    return '${d.year}/${_twoDigits(d.month)}/${_twoDigits(d.day)}';
  }
}
