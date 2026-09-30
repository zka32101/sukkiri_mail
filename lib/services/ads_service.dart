import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

/// Google Mobile Ads統合サービス（バナー・インタースティシャルのみ）。
/// 広告ユニットIDは公開情報のためデフォルト値として埋め込み、
/// --dart-define=ADMOB_*_AD_UNIT_ID_ANDROID=... 等で上書きも可能。
/// 【要確認】本番IDはAdMobコンソールでアプリ登録後に取得・差し替えが必要
/// （未設定の間はGoogle公式のテストIDにフォールバックする）。
class AdsService {
  static final AdsService _instance = AdsService._internal();

  factory AdsService() => _instance;

  AdsService._internal();

  // 2026-09-29、AdMobで発行済み（Android用のみ。iOSアプリをAdMobに追加後にiOS用IDを設定）。
  static const String _bannerAdUnitIdAndroid = String.fromEnvironment(
    'ADMOB_BANNER_AD_UNIT_ID_ANDROID',
    defaultValue: 'ca-app-pub-5058227312086483/3282437670',
  );
  static const String _bannerAdUnitIdIos = String.fromEnvironment(
    'ADMOB_BANNER_AD_UNIT_ID_IOS',
  );
  static const String _interstitialAdUnitIdAndroid = String.fromEnvironment(
    'ADMOB_INTERSTITIAL_AD_UNIT_ID_ANDROID',
    defaultValue: 'ca-app-pub-5058227312086483/8343192663',
  );
  static const String _interstitialAdUnitIdIos = String.fromEnvironment(
    'ADMOB_INTERSTITIAL_AD_UNIT_ID_IOS',
  );

  static final String _testBannerAdUnitId = Platform.isAndroid
      ? 'ca-app-pub-3940256099942544/6300978111'
      : 'ca-app-pub-3940256099942544/2934735716';

  static final String _testInterstitialAdUnitId = Platform.isAndroid
      ? 'ca-app-pub-3940256099942544/1033173712'
      : 'ca-app-pub-3940256099942544/4411468910';

  static String get bannerAdUnitId {
    final id = Platform.isAndroid ? _bannerAdUnitIdAndroid : _bannerAdUnitIdIos;
    return id.isNotEmpty ? id : _testBannerAdUnitId;
  }

  static String get interstitialAdUnitId {
    final id = Platform.isAndroid
        ? _interstitialAdUnitIdAndroid
        : _interstitialAdUnitIdIos;
    return id.isNotEmpty ? id : _testInterstitialAdUnitId;
  }

  InterstitialAd? _interstitialAd;
  bool get isInterstitialAdLoaded => _interstitialAd != null;

  Future<void> initialize() async {
    await MobileAds.instance.initialize();
  }

  Future<void> loadInterstitialAd({
    void Function()? onAdLoaded,
    void Function(LoadAdError)? onAdFailedToLoad,
  }) async {
    try {
      await InterstitialAd.load(
        adUnitId: interstitialAdUnitId,
        request: const AdRequest(),
        adLoadCallback: InterstitialAdLoadCallback(
          onAdLoaded: (ad) {
            _interstitialAd = ad;
            onAdLoaded?.call();
          },
          onAdFailedToLoad: (error) {
            onAdFailedToLoad?.call(error);
          },
        ),
      );
    } catch (e) {
      if (kDebugMode) debugPrint('Error loading interstitial ad: $e');
    }
  }

  Future<void> showInterstitialAd({void Function()? onAdDismissed}) async {
    final ad = _interstitialAd;
    if (ad == null) {
      onAdDismissed?.call();
      return;
    }
    ad.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        _interstitialAd = null;
        onAdDismissed?.call();
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        ad.dispose();
        _interstitialAd = null;
        onAdDismissed?.call();
      },
    );
    await ad.show();
  }

  void dispose() {
    _interstitialAd?.dispose();
    _interstitialAd = null;
  }
}
