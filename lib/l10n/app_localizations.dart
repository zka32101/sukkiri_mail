import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_de.dart';
import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_fr.dart';
import 'app_localizations_hi.dart';
import 'app_localizations_id.dart';
import 'app_localizations_ja.dart';
import 'app_localizations_ko.dart';
import 'app_localizations_pt.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('de'),
    Locale('en'),
    Locale('es'),
    Locale('fr'),
    Locale('hi'),
    Locale('id'),
    Locale('ja'),
    Locale('ko'),
    Locale('pt'),
    Locale('pt', 'BR'),
    Locale('zh'),
    Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hant'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In ja, this message translates to:
  /// **'スッキリメール'**
  String get appTitle;

  /// No description provided for @onboardingTitle.
  ///
  /// In ja, this message translates to:
  /// **'見なくていいメールから、解放されよう'**
  String get onboardingTitle;

  /// No description provided for @onboardingSubtitle.
  ///
  /// In ja, this message translates to:
  /// **'Gmail・Outlook・その他のメールを1つにまとめて、営業・通知メールを自動でアーカイブ'**
  String get onboardingSubtitle;

  /// No description provided for @onboardingCta.
  ///
  /// In ja, this message translates to:
  /// **'はじめる'**
  String get onboardingCta;

  /// No description provided for @accountLinkTitle.
  ///
  /// In ja, this message translates to:
  /// **'メールアカウントを連携'**
  String get accountLinkTitle;

  /// No description provided for @accountLinkGmail.
  ///
  /// In ja, this message translates to:
  /// **'Gmailで連携'**
  String get accountLinkGmail;

  /// No description provided for @accountLinkOutlook.
  ///
  /// In ja, this message translates to:
  /// **'Outlook / Hotmailで連携'**
  String get accountLinkOutlook;

  /// No description provided for @accountLinkImap.
  ///
  /// In ja, this message translates to:
  /// **'その他のメール（Yahoo!・iCloud等）'**
  String get accountLinkImap;

  /// No description provided for @scanResultTitle.
  ///
  /// In ja, this message translates to:
  /// **'{count}件の見なくていいメールを検出しました'**
  String scanResultTitle(int count);

  /// No description provided for @scanResultSubtitle.
  ///
  /// In ja, this message translates to:
  /// **'受信箱がここまですっきりします'**
  String get scanResultSubtitle;

  /// No description provided for @scanResultCta.
  ///
  /// In ja, this message translates to:
  /// **'アーカイブする'**
  String get scanResultCta;

  /// No description provided for @archiveCandidatesTitle.
  ///
  /// In ja, this message translates to:
  /// **'アーカイブ候補'**
  String get archiveCandidatesTitle;

  /// No description provided for @archiveCandidatesArchiveAll.
  ///
  /// In ja, this message translates to:
  /// **'すべてアーカイブ'**
  String get archiveCandidatesArchiveAll;

  /// No description provided for @archiveCandidatesPin.
  ///
  /// In ja, this message translates to:
  /// **'保護する'**
  String get archiveCandidatesPin;

  /// No description provided for @mailListTitle.
  ///
  /// In ja, this message translates to:
  /// **'メール一覧'**
  String get mailListTitle;

  /// No description provided for @mailListEmpty.
  ///
  /// In ja, this message translates to:
  /// **'表示できるメールがありません'**
  String get mailListEmpty;

  /// No description provided for @mailListPinToggleOn.
  ///
  /// In ja, this message translates to:
  /// **'保護する'**
  String get mailListPinToggleOn;

  /// No description provided for @mailListPinToggleOff.
  ///
  /// In ja, this message translates to:
  /// **'保護を解除'**
  String get mailListPinToggleOff;

  /// No description provided for @mailListBlockSender.
  ///
  /// In ja, this message translates to:
  /// **'この差出人を今後取り込まない'**
  String get mailListBlockSender;

  /// No description provided for @mailListSortByAccount.
  ///
  /// In ja, this message translates to:
  /// **'アカウント毎'**
  String get mailListSortByAccount;

  /// No description provided for @mailListSortByDate.
  ///
  /// In ja, this message translates to:
  /// **'日付順（全アカウント）'**
  String get mailListSortByDate;

  /// No description provided for @mailDetailTitle.
  ///
  /// In ja, this message translates to:
  /// **'メール詳細'**
  String get mailDetailTitle;

  /// No description provided for @mailDetailNoSubject.
  ///
  /// In ja, this message translates to:
  /// **'(件名なし)'**
  String get mailDetailNoSubject;

  /// No description provided for @mailDetailShowFullBody.
  ///
  /// In ja, this message translates to:
  /// **'本文を全文表示'**
  String get mailDetailShowFullBody;

  /// No description provided for @mailDetailOpenInMailApp.
  ///
  /// In ja, this message translates to:
  /// **'Gmailで開く'**
  String get mailDetailOpenInMailApp;

  /// No description provided for @mailBlockSenderConfirm.
  ///
  /// In ja, this message translates to:
  /// **'{sender} を今後取り込まないようにしますか？'**
  String mailBlockSenderConfirm(String sender);

  /// No description provided for @mailBlockSenderDone.
  ///
  /// In ja, this message translates to:
  /// **'差出人をブロックしました'**
  String get mailBlockSenderDone;

  /// No description provided for @settingsLocalCacheRetention.
  ///
  /// In ja, this message translates to:
  /// **'アプリでの自動非表示までの日数'**
  String get settingsLocalCacheRetention;

  /// No description provided for @settingsLocalCacheRetentionDescription.
  ///
  /// In ja, this message translates to:
  /// **'アプリの一覧表示だけに反映されます。実際のメールボックスは変更されません'**
  String get settingsLocalCacheRetentionDescription;

  /// No description provided for @dashboardTitle.
  ///
  /// In ja, this message translates to:
  /// **'受信箱スッキリ度'**
  String get dashboardTitle;

  /// No description provided for @dashboardArchivedCount.
  ///
  /// In ja, this message translates to:
  /// **'累計アーカイブ件数'**
  String get dashboardArchivedCount;

  /// No description provided for @dashboardFreedBytes.
  ///
  /// In ja, this message translates to:
  /// **'解放したローカル容量'**
  String get dashboardFreedBytes;

  /// No description provided for @dashboardPinnedCount.
  ///
  /// In ja, this message translates to:
  /// **'保護件数'**
  String get dashboardPinnedCount;

  /// No description provided for @ruleSettingsTitle.
  ///
  /// In ja, this message translates to:
  /// **'ルール設定'**
  String get ruleSettingsTitle;

  /// No description provided for @ruleSettingsCategoryTab.
  ///
  /// In ja, this message translates to:
  /// **'カテゴリルール'**
  String get ruleSettingsCategoryTab;

  /// No description provided for @ruleSettingsSenderBlockTab.
  ///
  /// In ja, this message translates to:
  /// **'差出人ブロック'**
  String get ruleSettingsSenderBlockTab;

  /// No description provided for @ruleSettingsAddRule.
  ///
  /// In ja, this message translates to:
  /// **'ルールを追加'**
  String get ruleSettingsAddRule;

  /// No description provided for @ruleSettingsSenderBlockPickSender.
  ///
  /// In ja, this message translates to:
  /// **'取り込み済みの差出人から選択'**
  String get ruleSettingsSenderBlockPickSender;

  /// No description provided for @ruleSettingsSenderBlockNoSenders.
  ///
  /// In ja, this message translates to:
  /// **'取り込み済みの差出人がありません'**
  String get ruleSettingsSenderBlockNoSenders;

  /// No description provided for @archiveRestoreTitle.
  ///
  /// In ja, this message translates to:
  /// **'アーカイブ済み一覧'**
  String get archiveRestoreTitle;

  /// No description provided for @archiveRestoreRestore.
  ///
  /// In ja, this message translates to:
  /// **'復元する'**
  String get archiveRestoreRestore;

  /// No description provided for @mailSearchTitle.
  ///
  /// In ja, this message translates to:
  /// **'検索'**
  String get mailSearchTitle;

  /// No description provided for @mailSearchHint.
  ///
  /// In ja, this message translates to:
  /// **'件名・送信者で検索'**
  String get mailSearchHint;

  /// No description provided for @settingsTitle.
  ///
  /// In ja, this message translates to:
  /// **'設定'**
  String get settingsTitle;

  /// No description provided for @settingsAccountColor.
  ///
  /// In ja, this message translates to:
  /// **'アカウントカラー'**
  String get settingsAccountColor;

  /// No description provided for @settingsLinkedAccounts.
  ///
  /// In ja, this message translates to:
  /// **'連携アカウント'**
  String get settingsLinkedAccounts;

  /// No description provided for @settingsPlan.
  ///
  /// In ja, this message translates to:
  /// **'プラン'**
  String get settingsPlan;

  /// No description provided for @settingsUsageGuide.
  ///
  /// In ja, this message translates to:
  /// **'使い方'**
  String get settingsUsageGuide;

  /// No description provided for @usageGuideTitle.
  ///
  /// In ja, this message translates to:
  /// **'スッキリメールの使い方'**
  String get usageGuideTitle;

  /// No description provided for @usageGuideIntro.
  ///
  /// In ja, this message translates to:
  /// **'見なくていいメールを、見ないで済むようにするアプリです。実際のメールボックスは一切変更しません。'**
  String get usageGuideIntro;

  /// No description provided for @usageGuideBulletAutoHide.
  ///
  /// In ja, this message translates to:
  /// **'アプリの表示だけを自動整理：設定した日数が経つと、このアプリの一覧からだけ非表示にします（実メールは消えません）'**
  String get usageGuideBulletAutoHide;

  /// No description provided for @usageGuideBulletDetail.
  ///
  /// In ja, this message translates to:
  /// **'メールをタップすると詳細画面が開き、本文の全文表示や差出人ブロックができます'**
  String get usageGuideBulletDetail;

  /// No description provided for @usageGuideBulletBlock.
  ///
  /// In ja, this message translates to:
  /// **'「この差出人を今後取り込まない」で、迷惑な送信元からのメールを次回以降取り込まないようにできます'**
  String get usageGuideBulletBlock;

  /// No description provided for @usageGuideBulletMultiAccount.
  ///
  /// In ja, this message translates to:
  /// **'複数アカウントはアカウントカラーで区別。メール一覧の並び替えでアカウント毎/日付順を切り替えられます'**
  String get usageGuideBulletMultiAccount;

  /// No description provided for @usageGuideClose.
  ///
  /// In ja, this message translates to:
  /// **'閉じる'**
  String get usageGuideClose;

  /// No description provided for @paywallTitle.
  ///
  /// In ja, this message translates to:
  /// **'スッキリメール Pro'**
  String get paywallTitle;

  /// No description provided for @paywallFeatureAdFree.
  ///
  /// In ja, this message translates to:
  /// **'広告非表示'**
  String get paywallFeatureAdFree;

  /// No description provided for @paywallFeatureUnlimitedAccounts.
  ///
  /// In ja, this message translates to:
  /// **'アカウント連携無制限'**
  String get paywallFeatureUnlimitedAccounts;

  /// No description provided for @paywallFeatureAutoRules.
  ///
  /// In ja, this message translates to:
  /// **'自動アーカイブルール'**
  String get paywallFeatureAutoRules;

  /// No description provided for @paywallFeatureUnlimitedRestore.
  ///
  /// In ja, this message translates to:
  /// **'復元無制限'**
  String get paywallFeatureUnlimitedRestore;

  /// No description provided for @paywallCta.
  ///
  /// In ja, this message translates to:
  /// **'Proにアップグレード'**
  String get paywallCta;

  /// No description provided for @paywallCtaWithPrice.
  ///
  /// In ja, this message translates to:
  /// **'{price}/月でProにアップグレード'**
  String paywallCtaWithPrice(String price);

  /// No description provided for @paywallPurchaseSuccess.
  ///
  /// In ja, this message translates to:
  /// **'Proへのアップグレードが完了しました'**
  String get paywallPurchaseSuccess;

  /// No description provided for @paywallPurchaseFailed.
  ///
  /// In ja, this message translates to:
  /// **'購入処理に失敗しました。時間をおいて再度お試しください'**
  String get paywallPurchaseFailed;

  /// No description provided for @settingsSyncInterval.
  ///
  /// In ja, this message translates to:
  /// **'自動取り込みの間隔'**
  String get settingsSyncInterval;

  /// No description provided for @settingsSyncIntervalHours.
  ///
  /// In ja, this message translates to:
  /// **'{hours}時間ごと'**
  String settingsSyncIntervalHours(int hours);

  /// No description provided for @settingsAccountReauthRequired.
  ///
  /// In ja, this message translates to:
  /// **'再連携が必要です'**
  String get settingsAccountReauthRequired;

  /// No description provided for @settingsAccountUnlink.
  ///
  /// In ja, this message translates to:
  /// **'連携解除'**
  String get settingsAccountUnlink;

  /// No description provided for @settingsAccountUnlinkConfirm.
  ///
  /// In ja, this message translates to:
  /// **'{email} の連携を解除しますか？取り込み済みのメールはアプリ上に残ります'**
  String settingsAccountUnlinkConfirm(String email);

  /// No description provided for @notificationSettingsTitle.
  ///
  /// In ja, this message translates to:
  /// **'通知する差出人'**
  String get notificationSettingsTitle;

  /// No description provided for @notificationSettingsDescription.
  ///
  /// In ja, this message translates to:
  /// **'選択した差出人からの新着メールのみ通知します。未選択の場合、通知は送信されません'**
  String get notificationSettingsDescription;

  /// No description provided for @notificationSettingsEmpty.
  ///
  /// In ja, this message translates to:
  /// **'まだ取り込まれたメールがありません'**
  String get notificationSettingsEmpty;

  /// No description provided for @commonRetry.
  ///
  /// In ja, this message translates to:
  /// **'再試行'**
  String get commonRetry;

  /// No description provided for @commonCancel.
  ///
  /// In ja, this message translates to:
  /// **'キャンセル'**
  String get commonCancel;

  /// No description provided for @commonConfirm.
  ///
  /// In ja, this message translates to:
  /// **'確認'**
  String get commonConfirm;

  /// No description provided for @commonBack.
  ///
  /// In ja, this message translates to:
  /// **'戻る'**
  String get commonBack;

  /// No description provided for @commonPin.
  ///
  /// In ja, this message translates to:
  /// **'保護'**
  String get commonPin;

  /// No description provided for @commonUnpin.
  ///
  /// In ja, this message translates to:
  /// **'保護解除'**
  String get commonUnpin;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>[
    'de',
    'en',
    'es',
    'fr',
    'hi',
    'id',
    'ja',
    'ko',
    'pt',
    'zh',
  ].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when language+script codes are specified.
  switch (locale.languageCode) {
    case 'zh':
      {
        switch (locale.scriptCode) {
          case 'Hant':
            return AppLocalizationsZhHant();
        }
        break;
      }
  }

  // Lookup logic when language+country codes are specified.
  switch (locale.languageCode) {
    case 'pt':
      {
        switch (locale.countryCode) {
          case 'BR':
            return AppLocalizationsPtBr();
        }
        break;
      }
  }

  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'de':
      return AppLocalizationsDe();
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
    case 'fr':
      return AppLocalizationsFr();
    case 'hi':
      return AppLocalizationsHi();
    case 'id':
      return AppLocalizationsId();
    case 'ja':
      return AppLocalizationsJa();
    case 'ko':
      return AppLocalizationsKo();
    case 'pt':
      return AppLocalizationsPt();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
