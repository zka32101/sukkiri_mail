// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appTitle => 'साफ़ मेल';

  @override
  String get onboardingTitle =>
      'जो मेल कभी देखने की ज़रूरत नहीं थी, उनसे आज़ाद हो जाइए';

  @override
  String get onboardingSubtitle =>
      'Gmail, Outlook और अन्य को एक ही इनबॉक्स में लाएं और प्रचार/सूचना मेल अपने आप संग्रहित करें';

  @override
  String get onboardingCta => 'शुरू करें';

  @override
  String get accountLinkTitle => 'मेल खाता जोड़ें';

  @override
  String get accountLinkGmail => 'Gmail जोड़ें';

  @override
  String get accountLinkOutlook => 'Outlook / Hotmail जोड़ें';

  @override
  String get accountLinkImap => 'अन्य मेल (Yahoo!, iCloud आदि)';

  @override
  String scanResultTitle(int count) {
    return '$count ऐसी मेल मिलीं जिन्हें देखने की ज़रूरत नहीं';
  }

  @override
  String get scanResultSubtitle => 'आपका इनबॉक्स अब इतना साफ़ दिखेगा';

  @override
  String get scanResultCta => 'अभी संग्रहित करें';

  @override
  String get archiveCandidatesTitle => 'संग्रहण के लिए उम्मीदवार';

  @override
  String get archiveCandidatesArchiveAll => 'सभी संग्रहित करें';

  @override
  String get archiveCandidatesPin => 'सुरक्षित करें';

  @override
  String get mailListTitle => 'メール一覧';

  @override
  String get mailListEmpty => '表示できるメールがありません';

  @override
  String get mailListPinToggleOn => '保護する';

  @override
  String get mailListPinToggleOff => '保護を解除';

  @override
  String get mailListBlockSender => 'この差出人を今後取り込まない';

  @override
  String get mailListSortByAccount => 'アカウント毎';

  @override
  String get mailListSortByDate => '日付順（全アカウント）';

  @override
  String get mailDetailTitle => 'メール詳細';

  @override
  String get mailDetailNoSubject => '(件名なし)';

  @override
  String get mailDetailShowFullBody => '本文を全文表示';

  @override
  String get mailDetailOpenInMailApp => 'Gmailで開く';

  @override
  String mailBlockSenderConfirm(String sender) {
    return '$sender を今後取り込まないようにしますか？';
  }

  @override
  String get mailBlockSenderDone => '差出人をブロックしました';

  @override
  String get settingsLocalCacheRetention => 'アプリでの自動非表示までの日数';

  @override
  String get settingsLocalCacheRetentionDescription =>
      'アプリの一覧表示だけに反映されます。実際のメールボックスは変更されません';

  @override
  String get dashboardTitle => 'इनबॉक्स की सफ़ाई';

  @override
  String get dashboardArchivedCount => 'कुल संग्रहित';

  @override
  String get dashboardFreedBytes => 'मुक्त हुआ स्थानीय स्थान';

  @override
  String get dashboardPinnedCount => 'सुरक्षित मेल';

  @override
  String get ruleSettingsTitle => 'नियम';

  @override
  String get ruleSettingsCategoryTab => 'श्रेणी नियम';

  @override
  String get ruleSettingsSenderBlockTab => 'प्रेषक अवरोध';

  @override
  String get ruleSettingsAddRule => 'नियम जोड़ें';

  @override
  String get ruleSettingsSenderBlockPickSender => '取り込み済みの差出人から選択';

  @override
  String get ruleSettingsSenderBlockNoSenders => '取り込み済みの差出人がありません';

  @override
  String get archiveRestoreTitle => 'संग्रहित मेल';

  @override
  String get archiveRestoreRestore => 'पुनर्स्थापित करें';

  @override
  String get mailSearchTitle => 'खोजें';

  @override
  String get mailSearchHint => 'विषय या प्रेषक से खोजें';

  @override
  String get settingsTitle => 'सेटिंग्स';

  @override
  String get settingsAccountColor => 'खाता रंग';

  @override
  String get settingsLinkedAccounts => 'जुड़े हुए खाते';

  @override
  String get settingsPlan => 'प्लान';

  @override
  String get settingsUsageGuide => '使い方';

  @override
  String get usageGuideTitle => 'スッキリメールの使い方';

  @override
  String get usageGuideIntro =>
      '見なくていいメールを、見ないで済むようにするアプリです。実際のメールボックスは一切変更しません。';

  @override
  String get usageGuideBulletAutoHide =>
      'アプリの表示だけを自動整理：設定した日数が経つと、このアプリの一覧からだけ非表示にします（実メールは消えません）';

  @override
  String get usageGuideBulletDetail => 'メールをタップすると詳細画面が開き、本文の全文表示や差出人ブロックができます';

  @override
  String get usageGuideBulletBlock =>
      '「この差出人を今後取り込まない」で、迷惑な送信元からのメールを次回以降取り込まないようにできます';

  @override
  String get usageGuideBulletMultiAccount =>
      '複数アカウントはアカウントカラーで区別。メール一覧の並び替えでアカウント毎/日付順を切り替えられます';

  @override
  String get usageGuideClose => '閉じる';

  @override
  String get paywallTitle => 'साफ़ मेल Pro';

  @override
  String get paywallFeatureAdFree => 'विज्ञापन-मुक्त';

  @override
  String get paywallFeatureUnlimitedAccounts => 'असीमित जुड़े खाते';

  @override
  String get paywallFeatureAutoRules => 'स्वचालित संग्रहण नियम';

  @override
  String get paywallFeatureUnlimitedRestore => 'असीमित पुनर्स्थापन';

  @override
  String get paywallCta => 'Pro में अपग्रेड करें';

  @override
  String paywallCtaWithPrice(String price) {
    return '$price/माह में Pro में अपग्रेड करें';
  }

  @override
  String get paywallPurchaseSuccess => 'Pro में सफलतापूर्वक अपग्रेड हो गया';

  @override
  String get paywallPurchaseFailed =>
      'खरीदारी विफल रही। कृपया बाद में पुनः प्रयास करें';

  @override
  String get settingsSyncInterval => 'ऑटो-सिंक अंतराल';

  @override
  String settingsSyncIntervalHours(int hours) {
    return 'हर $hours घंटे में';
  }

  @override
  String get settingsAccountReauthRequired => 'पुनः कनेक्ट करना आवश्यक है';

  @override
  String get settingsAccountUnlink => 'लिंक हटाएं';

  @override
  String settingsAccountUnlinkConfirm(String email) {
    return '$email को अनलिंक करें? पहले से आयातित मेल ऐप में बनी रहेगी।';
  }

  @override
  String get notificationSettingsTitle => 'सूचना के लिए प्रेषक';

  @override
  String get notificationSettingsDescription =>
      'आपको केवल चुने गए प्रेषकों से नई मेल की सूचना मिलेगी। यदि कोई नहीं चुना गया है, तो कोई सूचना नहीं भेजी जाएगी।';

  @override
  String get notificationSettingsEmpty => 'अभी तक कोई मेल आयात नहीं हुई';

  @override
  String get commonRetry => 'पुनः प्रयास करें';

  @override
  String get commonCancel => 'रद्द करें';

  @override
  String get commonConfirm => 'पुष्टि करें';

  @override
  String get commonBack => 'वापस';

  @override
  String get commonPin => 'सुरक्षित करें';

  @override
  String get commonUnpin => 'सुरक्षा हटाएं';
}
