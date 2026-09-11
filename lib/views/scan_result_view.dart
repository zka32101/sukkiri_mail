import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/linked_account.dart';
import '../viewmodels/scan_providers.dart';
import 'archive_candidates_view.dart';

/// Aha Moment動線 Step3: 「◯件の"見なくていいメール"を検出、受信箱がここまですっきりします」。
/// Cloud Tasks非同期スキャンに対応。
/// 1. scanAccountを呼び出してスキャン開始
/// 2. Firestore real-time listenerでscanStatus監視
/// 3. scanStatus="completed"になったらスキャン結果を表示
class ScanResultView extends ConsumerStatefulWidget {
  const ScanResultView({super.key, required this.account});

  final LinkedAccount account;

  @override
  ConsumerState<ScanResultView> createState() => _ScanResultViewState();
}

class _ScanResultViewState extends ConsumerState<ScanResultView> {
  late Future<void> _scanInitialization;

  @override
  void initState() {
    super.initState();
    // スキャン開始タスクをインスタンス化
    _scanInitialization =
        ref.read(startScanTaskProvider(widget.account).future);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scanStatusAsync = ref.watch(scanStatusProvider(widget.account.id));
    final scanResultsAsync =
        ref.watch(scanResultProvider(widget.account.id));

    return Scaffold(
      body: FutureBuilder<void>(
        future: _scanInitialization,
        builder: (context, initSnapshot) {
          // スキャン開始に失敗した場合
          if (initSnapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  '${initSnapshot.error}',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          // スキャン状態をリアルタイム監視
          return scanStatusAsync.when(
            loading: () => _buildLoading(context, l10n),
            error: (e, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('$e', textAlign: TextAlign.center),
              ),
            ),
            data: (account) {
              if (account == null) {
                return Center(
                  child: Text(l10n.errorAccountNotFound ?? 'Account not found'),
                );
              }

              final status = account.scanStatus;

              // スキャン進行中
              if (status == 'in_progress' || status == null) {
                return _buildScanning(context, l10n);
              }

              // スキャン失敗
              if (status == 'failed') {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 72),
                        const SizedBox(height: 24),
                        Text(
                          l10n.scanFailed ?? 'Scan failed',
                          style: Theme.of(context).textTheme.headlineSmall,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          account.scanError ?? '',
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                );
              }

              // スキャン完了 → 結果表示
              return scanResultsAsync.when(
                loading: () => _buildLoading(context, l10n),
                error: (e, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text('$e', textAlign: TextAlign.center),
                  ),
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
                                      account: widget.account,
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
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildLoading(BuildContext context, AppLocalizations l10n) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 24),
          Text(
            l10n.scanningInProgress ?? 'Scanning emails...',
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildScanning(BuildContext context, AppLocalizations l10n) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 24),
            Text(
              l10n.scanningInProgress ?? 'Scanning emails...',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              l10n.scanningDescription ??
                  'This may take a few minutes for large inboxes',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
