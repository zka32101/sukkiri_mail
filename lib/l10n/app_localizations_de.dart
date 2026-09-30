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
  String get dashboardArchivedCount => 'Insgesamt archiviert';

  @override
  String get dashboardFreedBytes => 'Freigegebener Speicherplatz';

  @override
  String get dashboardPinnedCount => 'Geschützte Mails';

  @override
  String get mailListTitle => 'E-Mail-Liste';

  @override
  String get mailListEmpty => 'Keine E-Mails vorhanden';

  @override
  String get mailListSortNewest => 'Neueste zuerst';

  @override
  String get mailListSortUnreadFirst => 'Ungelesene zuerst';

  @override
  String get mailListSortSender => 'Nach Absender';

  @override
  String get mailListGroupToggle => 'Nach Absender gruppieren';

  @override
  String mailListSelectionCount(int count) {
    return '$count ausgewählt';
  }

  @override
  String get mailListBulkArchive => 'Archivieren';

  @override
  String get mailListBulkMarkRead => 'Als gelesen markieren';

  @override
  String get mailListUnknownSender => '(Unbekannter Absender)';

  @override
  String get mailListPinToggleOn => '保護する';

  @override
  String get mailListPinToggleOff => '保護を解除';

  @override
  String get mailListBlockSender => 'この差出人を今後取り込まない';

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
  String get categoryAll => 'Alle';

  @override
  String get categoryPromotion => 'Werbung';

  @override
  String get categoryNotification => 'Benachrichtigungen';

  @override
  String get categoryInvoice => 'Rechnungen';

  @override
  String get categoryOther => 'Sonstige';

  @override
  String get ruleSettingsTitle => 'Regeln';

  @override
  String get ruleSettingsCategoryTab => 'Kategorieregeln';

  @override
  String get ruleSettingsSenderBlockTab => 'Absenderblockierung';

  @override
  String get ruleSettingsAddRule => 'Regel hinzufügen';

  @override
  String get ruleSettingsSenderBlockPickSender => '取り込み済みの差出人から選択';

  @override
  String get ruleSettingsSenderBlockNoSenders => '取り込み済みの差出人がありません';

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
  String get settingsUsageGuide => '使い方';

  @override
  String get settingsSyncInterval => 'Intervall für automatischen Abruf';

  @override
  String settingsSyncIntervalHours(int hours) {
    return 'Alle $hours Stunden';
  }

  @override
  String get settingsAccountReauthRequired => 'Erneute Verbindung erforderlich';

  @override
  String get settingsAccountUnlink => 'Verknüpfung aufheben';

  @override
  String settingsAccountUnlinkConfirm(String email) {
    return 'Verbindung zu $email aufheben? Bereits importierte E-Mails bleiben in der App erhalten.';
  }

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
  String get notificationSettingsTitle => 'Absender für Benachrichtigungen';

  @override
  String get notificationSettingsDescription =>
      'Du wirst nur über neue E-Mails der ausgewählten Absender benachrichtigt. Ist keiner ausgewählt, werden keine Benachrichtigungen gesendet.';

  @override
  String get notificationSettingsEmpty => 'Noch keine E-Mails importiert';

  @override
  String get paywallTitle => 'Klarpost Pro';

  @override
  String get paywallFeatureAdFree => 'Werbefrei';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Unbegrenzt verknüpfte Konten';

  @override
  String get paywallFeatureAutoRules => 'Automatische Archivierungsregeln';

  @override
  String get paywallFeatureUnlimitedRestore => 'Unbegrenztes Wiederherstellen';

  @override
  String get paywallCta => 'Auf Pro upgraden';

  @override
  String paywallCtaWithPrice(String price) {
    return 'Für $price/Monat auf Pro upgraden';
  }

  @override
  String get paywallPurchaseSuccess => 'Erfolgreich auf Pro aktualisiert';

  @override
  String get paywallPurchaseFailed =>
      'Kauf fehlgeschlagen. Bitte versuchen Sie es später erneut';

  @override
  String get commonRetry => 'Wiederholen';

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
