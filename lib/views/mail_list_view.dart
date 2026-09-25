import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/category_rule.dart';
import '../models/email_meta.dart';
import '../models/linked_account.dart';
import '../services/cloud_functions_mail_provider.dart';
import '../viewmodels/core_providers.dart';
import '../viewmodels/dashboard_providers.dart';
import '../viewmodels/linked_account_providers.dart';
import '../viewmodels/mail_list_providers.dart';

/// 「アーカイブすること」ではなく「メールを見やすく管理すること」を主目的にした
/// メイン画面。カテゴリ絞り込み・並び替え・送信者グルーピング・複数選択での
/// 一括操作（アーカイブ/既読化）を提供する。
class MailListView extends ConsumerStatefulWidget {
  const MailListView({super.key});

  @override
  ConsumerState<MailListView> createState() => _MailListViewState();
}

class _MailListViewState extends ConsumerState<MailListView> {
  // LinkedAccountのインスタンス自体ではなくidだけを状態として保持する理由は
  // archive_restore_view.dartと同じ（LinkedAccountは値等価を実装していないため）。
  String? _selectedAccountId;
  MailCategory? _selectedCategory; // null = すべて
  MailListSortOrder _sortOrder = MailListSortOrder.newest;
  bool _groupBySender = false;
  bool _selectionMode = false;
  final Set<String> _selectedIds = {};

  void _exitSelectionMode() {
    setState(() {
      _selectionMode = false;
      _selectedIds.clear();
    });
  }

  void _toggleSelection(String emailId) {
    setState(() {
      if (_selectedIds.contains(emailId)) {
        _selectedIds.remove(emailId);
      } else {
        _selectedIds.add(emailId);
      }
      if (_selectedIds.isEmpty) {
        _selectionMode = false;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final accountsAsync = ref.watch(linkedAccountsProvider);

    return Scaffold(
      appBar: _selectionMode
          ? _buildSelectionAppBar(l10n)
          : AppBar(
              title: Text(l10n.mailListTitle),
              actions: [
                IconButton(
                  tooltip: l10n.mailListGroupToggle,
                  icon: Icon(
                    _groupBySender
                        ? Icons.person
                        : Icons.person_outline,
                  ),
                  onPressed: () =>
                      setState(() => _groupBySender = !_groupBySender),
                ),
                PopupMenuButton<MailListSortOrder>(
                  icon: const Icon(Icons.sort),
                  initialValue: _sortOrder,
                  onSelected: (order) => setState(() => _sortOrder = order),
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: MailListSortOrder.newest,
                      child: Text(l10n.mailListSortNewest),
                    ),
                    PopupMenuItem(
                      value: MailListSortOrder.unreadFirst,
                      child: Text(l10n.mailListSortUnreadFirst),
                    ),
                    PopupMenuItem(
                      value: MailListSortOrder.sender,
                      child: Text(l10n.mailListSortSender),
                    ),
                  ],
                ),
              ],
            ),
      body: accountsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (accounts) {
          if (accounts.isEmpty) return const SizedBox.shrink();
          final selected = accounts.firstWhere(
            (a) => a.id == _selectedAccountId,
            orElse: () => accounts.first,
          );

          return Column(
            children: [
              if (accounts.length > 1)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: selected.id,
                    items: accounts
                        .map(
                          (a) => DropdownMenuItem(
                            value: a.id,
                            child: Text(a.emailAddress),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() {
                      _selectedAccountId = v;
                      _exitSelectionMode();
                    }),
                  ),
                ),
              _buildStatsBar(l10n),
              _buildCategoryChips(l10n),
              const Divider(height: 1),
              Expanded(child: _buildMailList(l10n, selected)),
            ],
          );
        },
      ),
    );
  }

  PreferredSizeWidget _buildSelectionAppBar(AppLocalizations l10n) {
    return AppBar(
      leading: IconButton(
        icon: const Icon(Icons.close),
        onPressed: _exitSelectionMode,
      ),
      title: Text(l10n.mailListSelectionCount(_selectedIds.length)),
      actions: [
        IconButton(
          tooltip: l10n.mailListBulkMarkRead,
          icon: const Icon(Icons.mark_email_read_outlined),
          onPressed: _bulkMarkRead,
        ),
        IconButton(
          tooltip: l10n.mailListBulkArchive,
          icon: const Icon(Icons.archive_outlined),
          onPressed: _bulkArchive,
        ),
      ],
    );
  }

  Widget _buildStatsBar(AppLocalizations l10n) {
    final statsAsync = ref.watch(tidinessStatsProvider);
    return statsAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (e, _) => const SizedBox.shrink(),
      data: (stats) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${l10n.dashboardArchivedCount}: ${stats.archivedCount}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Text(
              '${l10n.dashboardPinnedCount}: ${stats.pinnedCount}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryChips(AppLocalizations l10n) {
    final entries = <(MailCategory?, String)>[
      (null, l10n.categoryAll),
      (MailCategory.promotion, l10n.categoryPromotion),
      (MailCategory.notification, l10n.categoryNotification),
      (MailCategory.invoice, l10n.categoryInvoice),
      (MailCategory.other, l10n.categoryOther),
    ];
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: entries.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final (category, label) = entries[index];
          final isSelected = _selectedCategory == category;
          return ChoiceChip(
            label: Text(label),
            selected: isSelected,
            onSelected: (_) => setState(() => _selectedCategory = category),
          );
        },
      ),
    );
  }

  Widget _buildMailList(AppLocalizations l10n, LinkedAccount account) {
    final params = MailListParams(
      accountId: account.id,
      category: _selectedCategory,
    );
    final mailsAsync = ref.watch(activeMailsProvider(params));

    return mailsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (mails) {
        if (mails.isEmpty) {
          return Center(child: Text(l10n.mailListEmpty));
        }
        final sorted = sortMails(mails, _sortOrder);

        if (!_groupBySender) {
          return ListView.builder(
            itemCount: sorted.length,
            itemBuilder: (context, index) =>
                _buildMailTile(l10n, account, sorted[index]),
          );
        }

        final groups = groupBySender(sorted);
        final items = <Widget>[];
        for (final entry in groups.entries) {
          final senderLabel = entry.key.isEmpty
              ? l10n.mailListUnknownSender
              : entry.key;
          items.add(
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Text(
                '$senderLabel (${entry.value.length})',
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ),
          );
          for (final mail in entry.value) {
            items.add(_buildMailTile(l10n, account, mail));
          }
        }
        return ListView(children: items);
      },
    );
  }

  Widget _buildMailTile(
    AppLocalizations l10n,
    LinkedAccount account,
    EmailMeta mail,
  ) {
    final isSelected = _selectedIds.contains(mail.id);
    final titleText = mail.subject.isNotEmpty ? mail.subject : mail.snippet;
    final titleStyle = mail.isUnread
        ? const TextStyle(fontWeight: FontWeight.bold)
        : null;

    return ListTile(
      selected: isSelected,
      leading: _selectionMode
          ? Checkbox(
              value: isSelected,
              onChanged: (_) => _toggleSelection(mail.id),
            )
          : CircleIcon(isUnread: mail.isUnread),
      title: Text(titleText, maxLines: 1, overflow: TextOverflow.ellipsis, style: titleStyle),
      subtitle: Text(
        '${mail.senderEmail}  ·  ${mail.snippet}',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: mail.isPinned ? const Icon(Icons.push_pin, size: 18) : null,
      onTap: () async {
        if (_selectionMode) {
          _toggleSelection(mail.id);
          return;
        }
        if (mail.isUnread) {
          try {
            await ref.read(emailMetaRepositoryProvider).setUnread(mail.id, false);
          } catch (_) {
            // 既読化はタップの副作用に過ぎないため、失敗してもエラー表示はしない
            // （メール自体は正しく表示されており、ユーザー操作を妨げる必要がない）。
          }
        }
      },
      onLongPress: () {
        setState(() {
          _selectionMode = true;
          _selectedIds.add(mail.id);
        });
      },
    );
  }

  Future<void> _bulkArchive() async {
    final accounts = ref.read(linkedAccountsProvider).value;
    if (accounts == null || accounts.isEmpty) return;
    final account = accounts.firstWhere(
      (a) => a.id == _selectedAccountId,
      orElse: () => accounts.first,
    );

    final ids = _selectedIds.toList();
    _exitSelectionMode();
    try {
      final provider = resolveMailProvider(account.provider);
      await provider.archive(account: account, emailIds: ids);
      ref.invalidate(tidinessStatsProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _bulkMarkRead() async {
    final ids = _selectedIds.toList();
    _exitSelectionMode();
    try {
      await ref.read(emailMetaRepositoryProvider).setUnreadBatch(ids, false);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }
}

/// 未読/既読を示す小さなドット。
class CircleIcon extends StatelessWidget {
  const CircleIcon({super.key, required this.isUnread});

  final bool isUnread;

  @override
  Widget build(BuildContext context) {
    if (!isUnread) {
      return const SizedBox(width: 24, height: 24);
    }
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
