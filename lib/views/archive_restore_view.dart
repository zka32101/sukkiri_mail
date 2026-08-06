import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/linked_account.dart';
import '../services/cloud_functions_mail_provider.dart';
import '../viewmodels/email_search_providers.dart';
import '../viewmodels/linked_account_providers.dart';

/// アーカイブ済み一覧からの復元。誤操作時の安心材料として必須化（継続性の生命線）。
class ArchiveRestoreView extends ConsumerStatefulWidget {
  const ArchiveRestoreView({super.key});

  @override
  ConsumerState<ArchiveRestoreView> createState() => _ArchiveRestoreViewState();
}

class _ArchiveRestoreViewState extends ConsumerState<ArchiveRestoreView> {
  LinkedAccount? _selectedAccount;

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
          _selectedAccount ??= accounts.first;
          final archivedAsync = ref.watch(
            archivedEmailsProvider(_selectedAccount!.id),
          );
          return Column(
            children: [
              if (accounts.length > 1)
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: DropdownButton<LinkedAccount>(
                    isExpanded: true,
                    value: _selectedAccount,
                    items: accounts
                        .map(
                          (a) => DropdownMenuItem(
                            value: a,
                            child: Text(a.emailAddress),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _selectedAccount = v),
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
                        trailing: TextButton(
                          onPressed: () async {
                            final provider = resolveMailProvider(
                              _selectedAccount!.provider,
                            );
                            await provider.restore(
                              account: _selectedAccount!,
                              emailIds: [meta.id],
                            );
                          },
                          child: Text(l10n.archiveRestoreRestore),
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
