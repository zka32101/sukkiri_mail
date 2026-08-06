import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/linked_account.dart';
import '../viewmodels/scan_providers.dart';
import 'archive_candidates_view.dart';

/// Aha Moment動線 Step3: 「◯件の"見なくていいメール"を検出、受信箱がここまですっきりします」。
/// 実処理はアーカイブ、削除ではない。3タップ以内の最短動線として最優先実装。
class ScanResultView extends ConsumerWidget {
  const ScanResultView({super.key, required this.account});

  final LinkedAccount account;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final scanAsync = ref.watch(scanResultProvider(account));

    return Scaffold(
      body: Center(
        child: scanAsync.when(
          loading: () => const CircularProgressIndicator(),
          error: (e, _) => Padding(
            padding: const EdgeInsets.all(24),
            child: Text('$e', textAlign: TextAlign.center),
          ),
          data: (items) => Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.auto_awesome, size: 72),
                const SizedBox(height: 24),
                Text(
                  l10n.scanResultTitle(items.length),
                  style: Theme.of(context).textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(l10n.scanResultSubtitle, textAlign: TextAlign.center),
                const SizedBox(height: 32),
                FilledButton(
                  onPressed: items.isEmpty
                      ? null
                      : () {
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (_) => ArchiveCandidatesView(
                                account: account,
                                items: items,
                              ),
                            ),
                          );
                        },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                    child: Text(l10n.scanResultCta),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
