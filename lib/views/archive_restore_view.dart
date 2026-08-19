import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/linked_account.dart';
import '../services/cloud_functions_mail_provider.dart';
import '../viewmodels/dashboard_providers.dart';
import '../viewmodels/email_search_providers.dart';
import '../viewmodels/linked_account_providers.dart';

/// アーカイブ済み一覧からの復元。誤操作時の安心材料として必須化（継続性の生命線）。
class ArchiveRestoreView extends ConsumerStatefulWidget {
  const ArchiveRestoreView({super.key});

  @override
  ConsumerState<ArchiveRestoreView> createState() => _ArchiveRestoreViewState();
}

class _ArchiveRestoreViewState extends ConsumerState<ArchiveRestoreView> {
  // LinkedAccountのインスタンス自体ではなくidだけを状態として保持する。
  // linkedAccountsProviderはFirestoreの新しいスナップショットが来るたびに
  // （他アカウントのcolorHex変更、scan後のlastScanAt更新など、この画面と無関係な
  // 理由でも）全アカウントを毎回新しいLinkedAccountインスタンスとして再生成する。
  // LinkedAccountは値等価（==）を実装していないため、以前のようにインスタンス自体を
  // 保持しているとDropdownButtonのvalueがitemsのどれとも一致せず、
  // アサーションクラッシュ（またはリリースビルドでは選択状態が消える不具合）になっていた。
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
          // 選択中のアカウントが連携解除等で無くなっていた場合は先頭にフォールバックする。
          final selected = accounts.firstWhere(
            (a) => a.id == _selectedAccountId,
            orElse: () => accounts.first,
          );
          final archivedAsync = ref.watch(archivedEmailsProvider(selected.id));
          return Column(
            children: [
              if (accounts.length > 1)
                Padding(
                  padding: const EdgeInsets.all(12),
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
                        trailing: TextButton(
                          onPressed: () => _restore(selected, meta.id),
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

  Future<void> _restore(LinkedAccount account, String emailId) async {
    try {
      final provider = resolveMailProvider(account.provider);
      await provider.restore(account: account, emailIds: [emailId]);
      // アーカイブ件数がダッシュボードの集計に影響するため再取得させる。
      ref.invalidate(tidinessStatsProvider);
    } catch (e) {
      // 復元は「誤操作時の安心材料」として必須化された機能のため、失敗時に
      // 何のフィードバックも無いと、ユーザーはメールが復元されたと誤認したまま
      // 気づかない（このファイル冒頭のコメント参照）。他の操作（アーカイブ・ピン留め）
      // と同様にエラーをSnackBarで表示する。
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }
}
