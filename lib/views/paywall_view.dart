import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import '../l10n/app_localizations.dart';
import '../viewmodels/subscription_providers.dart';

/// 無料=広告表示・アカウント2つ・手動アーカイブ
/// 有料(月額$3)=広告非表示・無制限アカウント・自動アーカイブルール・復元無制限。
/// 【要確認】RevenueCatダッシュボード側で"ad_free"エンタイトルメント・
/// 月額$3のProduct/Offering登録が別途必要（未登録の間はofferingsが空でCTAが押せない）。
class PaywallView extends ConsumerWidget {
  const PaywallView({super.key});

  Future<void> _purchase(
    BuildContext context,
    WidgetRef ref,
    Package package,
  ) async {
    final l10n = AppLocalizations.of(context)!;
    final service = ref.read(subscriptionServiceProvider);
    try {
      await service.purchasePackage(package);
      await ref.read(adFreeProvider.notifier).refresh();
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.paywallPurchaseSuccess)));
        Navigator.of(context).pop();
      }
    } on PurchasesErrorCode catch (e) {
      if (e == PurchasesErrorCode.purchaseCancelledError) return;
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.paywallPurchaseFailed)));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.paywallPurchaseFailed)));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final offeringsAsync = ref.watch(offeringsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.paywallTitle)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _FeatureRow(text: l10n.paywallFeatureAdFree),
            _FeatureRow(text: l10n.paywallFeatureUnlimitedAccounts),
            _FeatureRow(text: l10n.paywallFeatureAutoRules),
            _FeatureRow(text: l10n.paywallFeatureUnlimitedRestore),
            const Spacer(),
            offeringsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, _) => SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: null,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: Text(l10n.paywallCta),
                  ),
                ),
              ),
              data: (offerings) {
                final package = offerings?.current?.availablePackages
                    .firstOrNull;
                return SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: package == null
                        ? null
                        : () => _purchase(context, ref, package),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: Text(
                        package == null
                            ? l10n.paywallCta
                            : l10n.paywallCtaWithPrice(
                                package.storeProduct.priceString,
                              ),
                      ),
                    ),
                  ),
                );
              },
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
