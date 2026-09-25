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
  String get mailListTitle => 'मेल सूची';

  @override
  String get mailListEmpty => 'दिखाने के लिए कोई मेल नहीं';

  @override
  String get mailListSortNewest => 'नवीनतम पहले';

  @override
  String get mailListSortUnreadFirst => 'अपठित पहले';

  @override
  String get mailListSortSender => 'प्रेषक के अनुसार';

  @override
  String get mailListGroupToggle => 'प्रेषक के अनुसार समूहित करें';

  @override
  String mailListSelectionCount(int count) {
    return '$count चयनित';
  }

  @override
  String get mailListBulkArchive => 'संग्रहित करें';

  @override
  String get mailListBulkMarkRead => 'पढ़ा हुआ चिह्नित करें';

  @override
  String get mailListUnknownSender => '(अज्ञात प्रेषक)';

  @override
  String get categoryAll => 'सभी';

  @override
  String get categoryPromotion => 'प्रचार';

  @override
  String get categoryNotification => 'सूचनाएं';

  @override
  String get categoryInvoice => 'चालान';

  @override
  String get categoryOther => 'अन्य';

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
  String get paywallTitle => 'साफ़ मेल Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => 'असीमित जुड़े खाते';

  @override
  String get paywallFeatureAutoRules => 'स्वचालित संग्रहण नियम';

  @override
  String get paywallFeatureUnlimitedRestore => 'असीमित पुनर्स्थापन';

  @override
  String get paywallCta => 'Pro में अपग्रेड करें';

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
