import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import '../services/subscription_service.dart';

final subscriptionServiceProvider = Provider<SubscriptionService>(
  (ref) => SubscriptionService(),
);

/// 広告非表示（ad_freeエンタイトルメント）状態。
/// RevenueCatのCustomerInfo更新を購読し、購入・復元直後に自動で反映する。
class AdFreeNotifier extends StateNotifier<bool> {
  AdFreeNotifier(this._service) : super(false) {
    _init();
  }

  final SubscriptionService _service;

  Future<void> _init() async {
    await _service.configure();
    final adFree = await _service.isAdFree();
    if (mounted) state = adFree;
    _service.addCustomerInfoUpdateListener((info) {
      final active = info.entitlements.active.containsKey(
        SubscriptionService.adFreeEntitlementId,
      );
      if (mounted) state = active;
    });
  }

  Future<void> refresh() async {
    final adFree = await _service.isAdFree();
    if (mounted) state = adFree;
  }
}

final adFreeProvider = StateNotifierProvider<AdFreeNotifier, bool>(
  (ref) => AdFreeNotifier(ref.watch(subscriptionServiceProvider)),
);

final offeringsProvider = FutureProvider<Offerings?>((ref) async {
  final service = ref.watch(subscriptionServiceProvider);
  return service.getOfferings();
});
