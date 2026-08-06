// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appTitle => 'Klarpost';

  @override
  String get onboardingTitle =>
      'Befrei dich von Mails, die du nie sehen musstest';

  @override
  String get onboardingSubtitle =>
      'Gmail, Outlook und mehr in einem Posteingang vereinen und Werbung/Benachrichtigungen automatisch archivieren';

  @override
  String get onboardingCta => 'Loslegen';

  @override
  String get accountLinkTitle => 'E-Mail-Konto verknüpfen';

  @override
  String get accountLinkGmail => 'Gmail verbinden';

  @override
  String get accountLinkOutlook => 'Outlook / Hotmail verbinden';

  @override
  String get accountLinkImap => 'Andere Mail (Yahoo!, iCloud usw.)';

  @override
  String scanResultTitle(int count) {
    return '$count Mails gefunden, die du nicht sehen musst';
  }

  @override
  String get scanResultSubtitle => 'So aufgeräumt wird dein Posteingang';

  @override
  String get scanResultCta => 'Jetzt archivieren';

  @override
  String get archiveCandidatesTitle => 'Archivierungsvorschläge';

  @override
  String get archiveCandidatesArchiveAll => 'Alle archivieren';

  @override
  String get archiveCandidatesPin => 'Schützen';

  @override
  String get dashboardTitle => 'Klarheit im Posteingang';

  @override
  String get dashboardArchivedCount => 'Insgesamt archiviert';

  @override
  String get dashboardFreedBytes => 'Freigegebener Speicherplatz';

  @override
  String get dashboardPinnedCount => 'Geschützte Mails';

  @override
  String get ruleSettingsTitle => 'Regeln';

  @override
  String get ruleSettingsCategoryTab => 'Kategorieregeln';

  @override
  String get ruleSettingsSenderBlockTab => 'Absenderblockierung';

  @override
  String get ruleSettingsAddRule => 'Regel hinzufügen';

  @override
  String get archiveRestoreTitle => 'Archivierte Mails';

  @override
  String get archiveRestoreRestore => 'Wiederherstellen';

  @override
  String get mailSearchTitle => 'Suche';

  @override
  String get mailSearchHint => 'Nach Betreff oder Absender suchen';

  @override
  String get settingsTitle => 'Einstellungen';

  @override
  String get settingsAccountColor => 'Kontofarbe';

  @override
  String get settingsLinkedAccounts => 'Verknüpfte Konten';

  @override
  String get settingsPlan => 'Tarif';

  @override
  String get paywallTitle => 'Klarpost Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Unbegrenzt verknüpfte Konten';

  @override
  String get paywallFeatureAutoRules => 'Automatische Archivierungsregeln';

  @override
  String get paywallFeatureUnlimitedRestore => 'Unbegrenztes Wiederherstellen';

  @override
  String get paywallCta => 'Auf Pro upgraden';

  @override
  String get commonCancel => 'Abbrechen';

  @override
  String get commonConfirm => 'Bestätigen';

  @override
  String get commonBack => 'Zurück';

  @override
  String get commonPin => 'Schützen';

  @override
  String get commonUnpin => 'Schutz aufheben';
}
