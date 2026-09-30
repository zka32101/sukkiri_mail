import 'package:flutter/foundation.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

/// RevenueCat経由のサブスクリプション管理。
/// 「ad_free」エンタイトルメント（月額$3プラン）を広告非表示判定に使う。
/// 【要確認】RevenueCat Public SDK Keyはダッシュボード発行待ち。
/// --dart-define=REVENUECAT_API_KEY_ANDROID / _IOS で注入する。
class SubscriptionService {
  static const String adFreeEntitlementId = 'ad_free';

  static const String _apiKeyAndroid = String.fromEnvironment(
    'REVENUECAT_API_KEY_ANDROID',
  );
  static const String _apiKeyIos = String.fromEnvironment(
    'REVENUECAT_API_KEY_IOS',
  );

  bool _configured = false;

  Future<void> configure() async {
    if (_configured) return;
    final apiKey = defaultTargetPlatform == TargetPlatform.iOS
        ? _apiKeyIos
        : _apiKeyAndroid;
    if (apiKey.isEmpty) {
      if (kDebugMode) {
        debugPrint('RevenueCat API key未設定のため課金機能は無効化されます');
      }
      return;
    }
    await Purchases.setLogLevel(
      kDebugMode ? LogLevel.debug : LogLevel.info,
    );
    await Purchases.configure(PurchasesConfiguration(apiKey));
    _configured = true;
  }

  bool get isConfigured => _configured;

  Future<bool> isAdFree() async {
    if (!_configured) return false;
    try {
      final info = await Purchases.getCustomerInfo();
      return info.entitlements.active.containsKey(adFreeEntitlementId);
    } catch (e) {
      if (kDebugMode) debugPrint('Error fetching customer info: $e');
      return false;
    }
  }

  Future<Offerings?> getOfferings() async {
    if (!_configured) return null;
    try {
      return await Purchases.getOfferings();
    } catch (e) {
      if (kDebugMode) debugPrint('Error fetching offerings: $e');
      return null;
    }
  }

  Future<CustomerInfo?> purchasePackage(Package package) async {
    try {
      return await Purchases.purchasePackage(package);
    } catch (e) {
      if (kDebugMode) debugPrint('Purchase failed: $e');
      rethrow;
    }
  }

  Future<CustomerInfo?> restorePurchases() async {
    if (!_configured) return null;
    try {
      return await Purchases.restorePurchases();
    } catch (e) {
      if (kDebugMode) debugPrint('Restore failed: $e');
      rethrow;
    }
  }

  void addCustomerInfoUpdateListener(void Function(CustomerInfo) listener) {
    if (!_configured) return;
    Purchases.addCustomerInfoUpdateListener(listener);
  }
}
