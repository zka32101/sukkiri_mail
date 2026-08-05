// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'TidyMail';

  @override
  String get onboardingTitle => 'Get free from mail you never needed to see';

  @override
  String get onboardingSubtitle =>
      'Bring Gmail, Outlook, and more into one inbox and auto-archive the noise';

  @override
  String get onboardingCta => 'Get Started';

  @override
  String get accountLinkTitle => 'Link a mail account';

  @override
  String get accountLinkGmail => 'Connect Gmail';

  @override
  String get accountLinkOutlook => 'Connect Outlook / Hotmail';

  @override
  String get accountLinkImap => 'Other mail (Yahoo!, iCloud, etc.)';

  @override
  String scanResultTitle(int count) {
    return 'Found $count emails you don\'t need to see';
  }

  @override
  String get scanResultSubtitle => 'Here\'s how tidy your inbox will be';

  @override
  String get scanResultCta => 'Archive now';

  @override
  String get archiveCandidatesTitle => 'Archive candidates';

  @override
  String get archiveCandidatesArchiveAll => 'Archive all';

  @override
  String get archiveCandidatesPin => 'Protect';

  @override
  String get dashboardTitle => 'Inbox tidiness';

  @override
  String get dashboardArchivedCount => 'Total archived';

  @override
  String get dashboardFreedBytes => 'Local storage freed';

  @override
  String get dashboardPinnedCount => 'Protected emails';

  @override
  String get ruleSettingsTitle => 'Rules';

  @override
  String get ruleSettingsCategoryTab => 'Category rules';

  @override
  String get ruleSettingsSenderBlockTab => 'Sender block';

  @override
  String get ruleSettingsAddRule => 'Add rule';

  @override
  String get archiveRestoreTitle => 'Archived emails';

  @override
  String get archiveRestoreRestore => 'Restore';

  @override
  String get mailSearchTitle => 'Search';

  @override
  String get mailSearchHint => 'Search by subject or sender';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get settingsAccountColor => 'Account color';

  @override
  String get settingsLinkedAccounts => 'Linked accounts';

  @override
  String get settingsPlan => 'Plan';

  @override
  String get paywallTitle => 'TidyMail Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Unlimited linked accounts';

  @override
  String get paywallFeatureAutoRules => 'Automatic archive rules';

  @override
  String get paywallFeatureUnlimitedRestore => 'Unlimited restore';

  @override
  String get paywallCta => 'Upgrade to Pro';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonConfirm => 'Confirm';

  @override
  String get commonBack => 'Back';

  @override
  String get commonPin => 'Protect';

  @override
  String get commonUnpin => 'Unprotect';
}
