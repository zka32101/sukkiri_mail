import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show PlatformException;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import '../l10n/app_localizations.dart';
import '../viewmodels/auth_provider.dart';
import '../viewmodels/core_providers.dart';

/// 無料=アカウント2つ・手動アーカイブ／有料=無制限・自動アーカイブルール・復元無制限。
/// RevenueCatの設定手順はlib/services/purchases_service.dartのコメントを参照。
class PaywallView extends ConsumerStatefulWidget {
  const PaywallView({super.key});

  @override
  ConsumerState<PaywallView> createState() => _PaywallViewState();
}

class _PaywallViewState extends ConsumerState<PaywallView> {
  bool _loading = true;
  bool _configured = false;
  bool _purchasing = false;
  Offering? _offering;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final userId = await ref.read(currentUserIdProvider.future);
      final service = ref.read(purchasesServiceProvider);
      final configured = await service.configure(userId);
      if (!configured) {
        if (!mounted) return;
        setState(() {
          _configured = false;
          _loading = false;
        });
        return;
      }
      final offerings = await service.getOfferings();
      if (!mounted) return;
      setState(() {
        _configured = true;
        _offering = offerings.current;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _purchase(Package package) async {
    setState(() => _purchasing = true);
    try {
      final service = ref.read(purchasesServiceProvider);
      final isPro = await service.purchase(package);
      if (!mounted) return;
      if (isPro) {
        // Firestore上のplanフィールドの正式な更新はRevenueCat Webhook経由で
        // 非同期に行われる（数秒〜数十秒のラグが出ることがある）。ここでは
        // 購入自体が成功したことをユーザーに伝え、画面を閉じるだけにとどめる。
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Proへのアップグレードが完了しました')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (!mounted) return;
      final message = _describePurchaseError(e);
      if (message != null) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
      }
    } finally {
      if (mounted) setState(() => _purchasing = false);
    }
  }

  /// ユーザーによる購入キャンセルはエラー表示不要。それ以外は内容をそのまま表示する。
  String? _describePurchaseError(Object e) {
    if (e is PlatformException) {
      final code = PurchasesErrorHelper.getErrorCode(e);
      if (code == PurchasesErrorCode.purchaseCancelledError) return null;
    }
    return '$e';
  }

  Future<void> _restore() async {
    setState(() => _purchasing = true);
    try {
      final service = ref.read(purchasesServiceProvider);
      final isPro = await service.restore();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isPro ? '購入履歴を復元しました' : '復元可能な購入履歴が見つかりませんでした'),
        ),
      );
      if (isPro) Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _purchasing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final package = _offering?.availablePackages.isNotEmpty == true
        ? _offering!.availablePackages.first
        : null;

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
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (!_configured)
              const Text(
                '課金機能は現在準備中です。',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              )
            else ...[
              if (package != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    package.storeProduct.priceString,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: (_purchasing || package == null)
                      ? null
                      : () => _purchase(package),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: _purchasing
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(l10n.paywallCta),
                  ),
                ),
              ),
              TextButton(
                onPressed: _purchasing ? null : _restore,
                child: const Text('購入履歴を復元'),
              ),
            ],
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
