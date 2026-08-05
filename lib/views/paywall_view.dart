import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

/// 無料=アカウント2つ・手動アーカイブ／有料=無制限・自動アーカイブルール・復元無制限。
/// RevenueCat Offerings取得はダッシュボード側のAPIキー設定待ち（【要確認】未接続時はUIのみ表示）。
class PaywallView extends StatelessWidget {
  const PaywallView({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.paywallTitle)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _FeatureRow(text: l10n.paywallFeatureUnlimitedAccounts),
            _FeatureRow(text: l10n.paywallFeatureAutoRules),
            _FeatureRow(text: l10n.paywallFeatureUnlimitedRestore),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                // TODO: RevenueCat Offerings接続後にpurchases_flutterの購入フローへ差し替え。
                onPressed: null,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Text(l10n.paywallCta),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline),
          const SizedBox(width: 12),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
