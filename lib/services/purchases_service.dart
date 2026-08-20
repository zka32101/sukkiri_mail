import 'dart:io' show Platform;

import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

/// RevenueCatダッシュボードで定義するEntitlement ID。Pro機能へのアクセス権を
/// 表すEntitlementはこの名前で作成すること（lib/services/purchases_service.dart
/// とfunctions/src/revenueCatWebhook.tsの両方でこの前提を置いている）。
const String kProEntitlementId = 'pro';

/// purchases_flutter（RevenueCat SDK）の初期化・購入・復元をまとめるサービス。
///
/// 【要確認】導入手順:
/// 1. RevenueCatダッシュボードでiOS/Android向けアプリをそれぞれ登録し、
///    公開SDKキー（"Public API Key"、非秘密）を取得する。
/// 2. Firebase Remote Configに以下のキーを登録する（デフォルト値＝各SDKキー）:
///    - revenuecat_ios_api_key
///    - revenuecat_android_api_key
/// 3. RevenueCatダッシュボードで、Pro機能に対応するEntitlementを作成し、
///    IDを`pro`にする（本ファイル上部の kProEntitlementId 参照）。
/// 4. App Store Connect / Google Play Consoleでサブスクリプション商品を作成し、
///    RevenueCat側のOffering/Packageに紐付ける。
/// 5. functions/src/revenueCatWebhook.ts のセットアップ手順に従い、
///    Webhookを登録する（購入イベントをFirestoreのuserプランへ反映するため必須）。
class PurchasesService {
  bool _configured = false;

  /// Remote Configから該当プラットフォームのAPIキーを取得し、SDKを初期化する。
  /// キー未設定（Remote Config未登録）の場合はfalseを返し、呼び出し側は
  /// 「準備中」として扱う（account_link_view.dartのOutlook未設定時と同じ方針）。
  Future<bool> configure(String firebaseUid) async {
    if (_configured) return true;

    final remoteConfig = FirebaseRemoteConfig.instance;
    try {
      await remoteConfig.setConfigSettings(
        RemoteConfigSettings(
          fetchTimeout: const Duration(seconds: 10),
          minimumFetchInterval: const Duration(hours: 1),
        ),
      );
      await remoteConfig.fetchAndActivate();
    } catch (_) {
      // オフライン等で取得に失敗した場合はSDKのデフォルト/キャッシュ値にフォールバックする。
    }

    final key = Platform.isIOS
        ? remoteConfig.getString('revenuecat_ios_api_key')
        : remoteConfig.getString('revenuecat_android_api_key');
    if (key.isEmpty) return false;

    // appUserIDにFirebaseのuidをそのまま渡す。RevenueCatのWebhookが送ってくる
    // app_user_idがこの値と一致するため、functions/src/revenueCatWebhook.tsは
    // それをそのままFirestoreのusersドキュメントIDとして使える。
    final configuration = PurchasesConfiguration(key)..appUserID = firebaseUid;
    await Purchases.configure(configuration);
    _configured = true;
    return true;
  }

  Future<Offerings> getOfferings() {
    return Purchases.getOfferings();
  }

  /// 購入完了後の権利判定は即時のUXフィードバック用。プランの正式な永続化は
  /// functions/src/revenueCatWebhook.tsがWebhook経由でFirestoreへ反映する
  /// （このメソッドはFirestoreのplanフィールドを直接書き換えない。
  /// firestore.rulesで意図的にクライアントからの直接変更を禁止しているため）。
  Future<bool> purchase(Package package) async {
    final customerInfo = await Purchases.purchasePackage(package);
    return customerInfo.entitlements.active.containsKey(kProEntitlementId);
  }

  Future<bool> restore() async {
    final customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active.containsKey(kProEntitlementId);
  }
}
