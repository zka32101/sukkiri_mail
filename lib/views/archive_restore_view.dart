import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../viewmodels/email_search_providers.dart';
import '../viewmodels/linked_account_providers.dart';

/// アーカイブ済み一覧の表示のみ（復元機能は不要のため削除済み）。
class ArchiveRestoreView extends ConsumerStatefulWidget {
  const ArchiveRestoreView({super.key});

  @override
  ConsumerState<ArchiveRestoreView> createState() => _ArchiveRestoreViewState();
}

class _ArchiveRestoreViewState extends ConsumerState<ArchiveRestoreView> {
  String? _selectedAccountId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final accountsAsync = ref.watch(linkedAccountsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.archiveRestoreTitle)),
      body: accountsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (accounts) {
          if (accounts.isEmpty) return const SizedBox.shrink();
          // 再連携でアカウントIDが変わる（解除→再連携で新規ドキュメントになる）ことがあるため、
          // 選択中のIDが現在のリストに無ければ先頭へフォールバックする。
          if (_selectedAccountId == null ||
              !accounts.any((a) => a.id == _selectedAccountId)) {
            _selectedAccountId = accounts.first.id;
          }
          final archivedAsync = ref.watch(
            archivedEmailsProvider(_selectedAccountId!),
          );
          return Column(
            children: [
              if (accounts.length > 1)
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: _selectedAccountId,
                    items: accounts
                        .map(
                          (a) => DropdownMenuItem(
                            value: a.id,
                            child: Text(a.emailAddress),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _selectedAccountId = v),
                  ),
                ),
              Expanded(
                child: archivedAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('$e')),
                  data: (metas) => ListView.builder(
                    itemCount: metas.length,
                    itemBuilder: (context, index) {
                      final meta = metas[index];
                      return ListTile(
                        title: Text(
                          meta.snippet,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
