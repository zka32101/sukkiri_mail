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
  String get mailListTitle => 'Inbox';

  @override
  String get mailListEmpty => 'No emails to show';

  @override
  String get mailListPinToggleOn => 'Pin';

  @override
  String get mailListPinToggleOff => 'Unpin';

  @override
  String get mailListBlockSender => 'Stop importing this sender';

  @override
  String get mailListSortByAccount => 'By account';

  @override
  String get mailListSortByDate => 'By date (all accounts)';

  @override
  String get mailDetailTitle => 'Mail detail';

  @override
  String get mailDetailNoSubject => '(no subject)';

  @override
  String get mailDetailShowFullBody => 'Show full message';

  @override
  String get mailDetailOpenInMailApp => 'Open in Gmail';

  @override
  String mailBlockSenderConfirm(String sender) {
    return 'Stop importing mail from $sender?';
  }

  @override
  String get mailBlockSenderDone => 'Sender blocked';

  @override
  String get settingsLocalCacheRetention => 'Auto-hide from this app after';

  @override
  String get settingsLocalCacheRetentionDescription =>
      'Only affects what this app shows — your real inbox is never changed';

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
  String get ruleSettingsSenderBlockPickSender =>
      'Choose from imported senders';

  @override
  String get ruleSettingsSenderBlockNoSenders => 'No imported senders yet';

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
  String get settingsUsageGuide => 'How to use';

  @override
  String get usageGuideTitle => 'How TidyMail works';

  @override
  String get usageGuideIntro =>
      'This app helps you stop seeing mail you don\'t need to. It never changes your real inbox.';

  @override
  String get usageGuideBulletAutoHide =>
      'Auto-hide in this app only: after your chosen number of days, mail disappears from this app\'s list (your real inbox is untouched)';

  @override
  String get usageGuideBulletDetail =>
      'Tap any mail to open its detail screen, where you can read the full message or block its sender';

  @override
  String get usageGuideBulletBlock =>
      '\"Stop importing this sender\" keeps unwanted senders from being imported again';

  @override
  String get usageGuideBulletMultiAccount =>
      'Multiple accounts are color-coded. Switch the mail list between per-account grouping and merged date order';

  @override
  String get usageGuideClose => 'Close';

  @override
  String get paywallTitle => 'TidyMail Pro';

  @override
  String get paywallFeatureAdFree => 'Ad-free';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Unlimited linked accounts';

  @override
  String get paywallFeatureAutoRules => 'Automatic archive rules';

  @override
  String get paywallFeatureUnlimitedRestore => 'Unlimited restore';

  @override
  String get paywallCta => 'Upgrade to Pro';

  @override
  String paywallCtaWithPrice(String price) {
    return 'Upgrade to Pro for $price/mo';
  }

  @override
  String get paywallPurchaseSuccess => 'Upgraded to Pro successfully';

  @override
  String get paywallPurchaseFailed => 'Purchase failed. Please try again later';

  @override
  String get settingsSyncInterval => 'Auto-sync interval';

  @override
  String settingsSyncIntervalHours(int hours) {
    return 'Every $hours hours';
  }

  @override
  String get settingsAccountReauthRequired => 'Reconnection needed';

  @override
  String get settingsAccountUnlink => 'Unlink';

  @override
  String settingsAccountUnlinkConfirm(String email) {
    return 'Unlink $email? Already imported mail will remain in the app.';
  }

  @override
  String get notificationSettingsTitle => 'Notify for senders';

  @override
  String get notificationSettingsDescription =>
      'You\'ll only be notified about new mail from the senders you select. If none are selected, no notifications are sent.';

  @override
  String get notificationSettingsEmpty => 'No emails imported yet';

  @override
  String get commonRetry => 'Retry';

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
