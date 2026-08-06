// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appTitle => '清爽信箱';

  @override
  String get onboardingTitle => '從不必看的郵件中解放自己';

  @override
  String get onboardingSubtitle => '把Gmail、Outlook等信箱整合為一，自動封存廣告與通知郵件';

  @override
  String get onboardingCta => '開始使用';

  @override
  String get accountLinkTitle => '連結郵件帳號';

  @override
  String get accountLinkGmail => '連結 Gmail';

  @override
  String get accountLinkOutlook => '連結 Outlook / Hotmail';

  @override
  String get accountLinkImap => '其他信箱（Yahoo!、iCloud 等）';

  @override
  String scanResultTitle(int count) {
    return '偵測到 $count 封不必看的郵件';
  }

  @override
  String get scanResultSubtitle => '整理後的收件匣會是這樣';

  @override
  String get scanResultCta => '立即封存';

  @override
  String get archiveCandidatesTitle => '封存候選郵件';

  @override
  String get archiveCandidatesArchiveAll => '全部封存';

  @override
  String get archiveCandidatesPin => '保護';

  @override
  String get dashboardTitle => '收件匣清爽度';

  @override
  String get dashboardArchivedCount => '累計封存件數';

  @override
  String get dashboardFreedBytes => '已釋放的本機空間';

  @override
  String get dashboardPinnedCount => '已保護件數';

  @override
  String get ruleSettingsTitle => '規則設定';

  @override
  String get ruleSettingsCategoryTab => '分類規則';

  @override
  String get ruleSettingsSenderBlockTab => '寄件人封鎖';

  @override
  String get ruleSettingsAddRule => '新增規則';

  @override
  String get archiveRestoreTitle => '已封存郵件';

  @override
  String get archiveRestoreRestore => '還原';

  @override
  String get mailSearchTitle => '搜尋';

  @override
  String get mailSearchHint => '以主旨或寄件人搜尋';

  @override
  String get settingsTitle => '設定';

  @override
  String get settingsAccountColor => '帳號顏色';

  @override
  String get settingsLinkedAccounts => '已連結帳號';

  @override
  String get settingsPlan => '方案';

  @override
  String get paywallTitle => '清爽信箱 Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => '無限連結帳號';

  @override
  String get paywallFeatureAutoRules => '自動封存規則';

  @override
  String get paywallFeatureUnlimitedRestore => '無限次還原';

  @override
  String get paywallCta => '升級為 Pro';

  @override
  String get commonCancel => '取消';

  @override
  String get commonConfirm => '確認';

  @override
  String get commonBack => '返回';

  @override
  String get commonPin => '保護';

  @override
  String get commonUnpin => '取消保護';
}

/// The translations for Chinese, using the Han script (`zh_Hant`).
class AppLocalizationsZhHant extends AppLocalizationsZh {
  AppLocalizationsZhHant() : super('zh_Hant');

  @override
  String get appTitle => '清爽信箱';

  @override
  String get onboardingTitle => '從不必看的郵件中解放自己';

  @override
  String get onboardingSubtitle => '把Gmail、Outlook等信箱整合為一，自動封存廣告與通知郵件';

  @override
  String get onboardingCta => '開始使用';

  @override
  String get accountLinkTitle => '連結郵件帳號';

  @override
  String get accountLinkGmail => '連結 Gmail';

  @override
  String get accountLinkOutlook => '連結 Outlook / Hotmail';

  @override
  String get accountLinkImap => '其他信箱（Yahoo!、iCloud 等）';

  @override
  String scanResultTitle(int count) {
    return '偵測到 $count 封不必看的郵件';
  }

  @override
  String get scanResultSubtitle => '整理後的收件匣會是這樣';

  @override
  String get scanResultCta => '立即封存';

  @override
  String get archiveCandidatesTitle => '封存候選郵件';

  @override
  String get archiveCandidatesArchiveAll => '全部封存';

  @override
  String get archiveCandidatesPin => '保護';

  @override
  String get dashboardTitle => '收件匣清爽度';

  @override
  String get dashboardArchivedCount => '累計封存件數';

  @override
  String get dashboardFreedBytes => '已釋放的本機空間';

  @override
  String get dashboardPinnedCount => '已保護件數';

  @override
  String get ruleSettingsTitle => '規則設定';

  @override
  String get ruleSettingsCategoryTab => '分類規則';

  @override
  String get ruleSettingsSenderBlockTab => '寄件人封鎖';

  @override
  String get ruleSettingsAddRule => '新增規則';

  @override
  String get archiveRestoreTitle => '已封存郵件';

  @override
  String get archiveRestoreRestore => '還原';

  @override
  String get mailSearchTitle => '搜尋';

  @override
  String get mailSearchHint => '以主旨或寄件人搜尋';

  @override
  String get settingsTitle => '設定';

  @override
  String get settingsAccountColor => '帳號顏色';

  @override
  String get settingsLinkedAccounts => '已連結帳號';

  @override
  String get settingsPlan => '方案';

  @override
  String get paywallTitle => '清爽信箱 Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => '無限連結帳號';

  @override
  String get paywallFeatureAutoRules => '自動封存規則';

  @override
  String get paywallFeatureUnlimitedRestore => '無限次還原';

  @override
  String get paywallCta => '升級為 Pro';

  @override
  String get commonCancel => '取消';

  @override
  String get commonConfirm => '確認';

  @override
  String get commonBack => '返回';

  @override
  String get commonPin => '保護';

  @override
  String get commonUnpin => '取消保護';
}
