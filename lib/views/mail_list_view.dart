import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/email_meta.dart';
import '../models/linked_account.dart';
import '../theme/app_theme.dart';
import '../viewmodels/core_providers.dart';
import '../viewmodels/email_list_providers.dart';
import '../viewmodels/linked_account_providers.dart';
import '../viewmodels/mail_actions.dart';
import 'account_link_view.dart';
import 'mail_detail_view.dart';

/// メール一覧の並び順：アカウント毎（グルーピング表示）か、全アカウント混在で日付順か。
enum MailListSortMode { byAccount, byDateAcrossAccounts }

final mailListSortModeProvider =
    StateProvider<MailListSortMode>((ref) => MailListSortMode.byAccount);

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
    final sortMode = ref.watch(mailListSortModeProvider);

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
      appBar: AppBar(
        title: Text(l10n.mailListTitle),
        actions: [
          PopupMenuButton<MailListSortMode>(
            icon: const Icon(Icons.sort),
            initialValue: sortMode,
            onSelected: (mode) =>
                ref.read(mailListSortModeProvider.notifier).state = mode,
            itemBuilder: (context) => [
              CheckedPopupMenuItem(
                value: MailListSortMode.byAccount,
                checked: sortMode == MailListSortMode.byAccount,
                child: Text(l10n.mailListSortByAccount),
              ),
              CheckedPopupMenuItem(
                value: MailListSortMode.byDateAcrossAccounts,
                checked: sortMode == MailListSortMode.byDateAcrossAccounts,
                child: Text(l10n.mailListSortByDate),
              ),
            ],
          ),
        ],
      ),
      body: sortMode == MailListSortMode.byAccount
          ? ListView(
              children: accounts
                  .expand(
                    (account) => _AccountEmailSection(
                      account: account,
                      brightness: brightness,
                    ).buildTiles(context, ref),
                  )
                  .toList(),
            )
          : _MergedEmailList(accounts: accounts, brightness: brightness),
    );
  }
}

/// 全アカウント混在・日付順表示。各行はアカウントカラーの左枠線で
/// どのアカウントのメールかひと目でわかるようにする。
class _MergedEmailList extends ConsumerWidget {
  const _MergedEmailList({required this.accounts, required this.brightness});

  final List<LinkedAccount> accounts;
  final Brightness brightness;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final accountsById = {for (final a in accounts) a.id: a};

    final entries = <(EmailMeta, LinkedAccount)>[];
    var anyLoading = false;
    for (final account in accounts) {
      final async = ref.watch(visibleEmailsProvider(account.id));
      async.when(
        loading: () => anyLoading = true,
        error: (_, _) {},
        data: (metas) {
          for (final meta in metas) {
            entries.add((meta, accountsById[account.id]!));
          }
        },
      );
    }
    entries.sort((a, b) => b.$1.receivedAt.compareTo(a.$1.receivedAt));

    if (entries.isEmpty) {
      if (anyLoading) {
        return const Center(child: CircularProgressIndicator());
      }
      return Center(child: Text(l10n.mailListEmpty));
    }

    return ListView.builder(
      itemCount: entries.length,
      itemBuilder: (context, index) {
        final (meta, account) = entries[index];
        return _EmailTile(
          meta: meta,
          account: account,
          l10n: l10n,
          ref: ref,
          accountColor: AppTheme.accountColorFor(account.colorHex, brightness),
        );
      },
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
    final accountColor = AppTheme.accountColorFor(account.colorHex, brightness);

    return [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
        child: Row(
          children: [
            CircleAvatar(
              radius: 6,
              backgroundColor: accountColor,
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
                .map((meta) => _EmailTile(
                      meta: meta,
                      account: account,
                      l10n: l10n,
                      ref: ref,
                      accountColor: accountColor,
                    ))
                .toList(),
          );
        },
      ),
      const Divider(height: 24),
    ];
  }
}

class _EmailTile extends StatelessWidget {
  const _EmailTile({
    required this.meta,
    required this.account,
    required this.l10n,
    required this.ref,
    required this.accountColor,
  });

  final EmailMeta meta;
  final LinkedAccount account;
  final AppLocalizations l10n;
  final WidgetRef ref;
  final Color accountColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: accountColor, width: 4)),
      ),
      child: ListTile(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => MailDetailView(meta: meta, account: account),
          ),
        ),
        title: Text(
          meta.subject.isNotEmpty
              ? meta.subject
              : (meta.snippet.isEmpty ? l10n.mailDetailNoSubject : meta.snippet),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontSize: 15),
        ),
        subtitle: Text(
          meta.senderEmail.isEmpty
              ? _formatDate(meta.receivedAt)
              : '${meta.senderEmail} ・ ${_formatDate(meta.receivedAt)}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (meta.senderEmail.isNotEmpty)
              IconButton(
                icon: const Icon(Icons.block),
                tooltip: l10n.mailListBlockSender,
                onPressed: () => _blockSender(context),
              ),
            IconButton(
              icon: Icon(
                meta.isPinned ? Icons.push_pin : Icons.push_pin_outlined,
              ),
              tooltip: meta.isPinned
                  ? l10n.mailListPinToggleOff
                  : l10n.mailListPinToggleOn,
              onPressed: () => ref
                  .read(emailMetaRepositoryProvider)
                  .setPinned(meta.id, !meta.isPinned),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _blockSender(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(l10n.mailBlockSenderConfirm(meta.senderEmail)),
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
    if (confirmed != true || !context.mounted) return;

    await blockSenderOneClick(ref, senderEmail: meta.senderEmail);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.mailBlockSenderDone)),
    );
  }

  static String _twoDigits(int n) => n.toString().padLeft(2, '0');

  String _formatDate(DateTime d) {
    return '${d.year}/${_twoDigits(d.month)}/${_twoDigits(d.day)}';
  }
}
