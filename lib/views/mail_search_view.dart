import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../viewmodels/email_search_providers.dart';
import '../viewmodels/linked_account_providers.dart';

/// メタデータ（件名・送信者・日時・カテゴリ・スニペット）は常時検索可能。
/// タップ時のみオンデマンドで該当1通だけクラウド取得する導線は本文表示画面側で実装。
class MailSearchView extends ConsumerStatefulWidget {
  const MailSearchView({super.key});

  @override
  ConsumerState<MailSearchView> createState() => _MailSearchViewState();
}

class _MailSearchViewState extends ConsumerState<MailSearchView> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final accounts = ref.watch(linkedAccountsProvider).valueOrNull ?? [];

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          decoration: InputDecoration(hintText: l10n.mailSearchHint, border: InputBorder.none),
          onSubmitted: (v) => setState(() => _query = v),
        ),
      ),
      body: accounts.isEmpty || _query.trim().isEmpty
          ? Center(child: Text(l10n.mailSearchTitle))
          : ListView(
              children: accounts.map((account) {
                final resultsAsync = ref.watch(
                  mailSearchProvider(MailSearchParams(accountId: account.id, query: _query)),
                );
                return resultsAsync.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (e, _) => Text('$e'),
                  data: (metas) => Column(
                    children: metas
                        .map((m) => ListTile(
                              title: Text(m.snippet, maxLines: 1, overflow: TextOverflow.ellipsis),
                              subtitle: Text(account.emailAddress),
                            ))
                        .toList(),
                  ),
                );
              }).toList(),
            ),
    );
  }
}
