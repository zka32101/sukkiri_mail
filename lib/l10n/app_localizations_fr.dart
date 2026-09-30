// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'Boîte Zen';

  @override
  String get onboardingTitle =>
      'Libérez-vous des e-mails que vous n\'avez jamais eu besoin de voir';

  @override
  String get onboardingSubtitle =>
      'Réunissez Gmail, Outlook et plus dans une seule boîte et archivez automatiquement le superflu';

  @override
  String get onboardingCta => 'Commencer';

  @override
  String get accountLinkTitle => 'Lier un compte e-mail';

  @override
  String get accountLinkGmail => 'Connecter Gmail';

  @override
  String get accountLinkOutlook => 'Connecter Outlook / Hotmail';

  @override
  String get accountLinkImap => 'Autre messagerie (Yahoo!, iCloud, etc.)';

  @override
  String scanResultTitle(int count) {
    return '$count e-mails que vous n\'avez pas besoin de voir ont été trouvés';
  }

  @override
  String get scanResultSubtitle =>
      'Voici à quel point votre boîte sera apaisée';

  @override
  String get scanResultCta => 'Archiver maintenant';

  @override
  String get archiveCandidatesTitle => 'Candidats à l\'archivage';

  @override
  String get archiveCandidatesArchiveAll => 'Tout archiver';

  @override
  String get archiveCandidatesPin => 'Protéger';

  @override
  String get dashboardArchivedCount => 'Total archivé';

  @override
  String get dashboardFreedBytes => 'Espace local libéré';

  @override
  String get dashboardPinnedCount => 'E-mails protégés';

  @override
  String get mailListTitle => 'Liste des e-mails';

  @override
  String get mailListEmpty => 'Aucun e-mail à afficher';

  @override
  String get mailListSortNewest => 'Plus récents';

  @override
  String get mailListSortUnreadFirst => 'Non lus d\'abord';

  @override
  String get mailListSortSender => 'Par expéditeur';

  @override
  String get mailListGroupToggle => 'Regrouper par expéditeur';

  @override
  String mailListSelectionCount(int count) {
    return '$count sélectionné(s)';
  }

  @override
  String get mailListBulkArchive => 'Archiver';

  @override
  String get mailListBulkMarkRead => 'Marquer comme lu';

  @override
  String get mailListUnknownSender => '(Expéditeur inconnu)';

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
  String get categoryAll => 'Tous';

  @override
  String get categoryPromotion => 'Promotions';

  @override
  String get categoryNotification => 'Notifications';

  @override
  String get categoryInvoice => 'Factures';

  @override
  String get categoryOther => 'Autres';

  @override
  String get ruleSettingsTitle => 'Règles';

  @override
  String get ruleSettingsCategoryTab => 'Règles par catégorie';

  @override
  String get ruleSettingsSenderBlockTab => 'Blocage d\'expéditeur';

  @override
  String get ruleSettingsAddRule => 'Ajouter une règle';

  @override
  String get ruleSettingsSenderBlockPickSender => '取り込み済みの差出人から選択';

  @override
  String get ruleSettingsSenderBlockNoSenders => '取り込み済みの差出人がありません';

  @override
  String get archiveRestoreTitle => 'E-mails archivés';

  @override
  String get archiveRestoreRestore => 'Restaurer';

  @override
  String get mailSearchTitle => 'Recherche';

  @override
  String get mailSearchHint => 'Rechercher par objet ou expéditeur';

  @override
  String get settingsTitle => 'Paramètres';

  @override
  String get settingsAccountColor => 'Couleur du compte';

  @override
  String get settingsLinkedAccounts => 'Comptes liés';

  @override
  String get settingsPlan => 'Formule';

  @override
  String get settingsUsageGuide => '使い方';

  @override
  String get settingsSyncInterval =>
      'Intervalle de synchronisation automatique';

  @override
  String settingsSyncIntervalHours(int hours) {
    return 'Toutes les $hours heures';
  }

  @override
  String get settingsAccountReauthRequired => 'Reconnexion nécessaire';

  @override
  String get settingsAccountUnlink => 'Dissocier';

  @override
  String settingsAccountUnlinkConfirm(String email) {
    return 'Dissocier $email ? Les e-mails déjà importés resteront dans l\'application.';
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
  String get notificationSettingsTitle => 'Expéditeurs à notifier';

  @override
  String get notificationSettingsDescription =>
      'Vous ne serez notifié que des nouveaux e-mails des expéditeurs sélectionnés. Si aucun n\'est sélectionné, aucune notification ne sera envoyée.';

  @override
  String get notificationSettingsEmpty => 'Aucun e-mail importé pour le moment';

  @override
  String get paywallTitle => 'Boîte Zen Pro';

  @override
  String get paywallFeatureAdFree => 'Sans publicité';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Comptes liés illimités';

  @override
  String get paywallFeatureAutoRules => 'Règles d\'archivage automatique';

  @override
  String get paywallFeatureUnlimitedRestore => 'Restauration illimitée';

  @override
  String get paywallCta => 'Passer à Pro';

  @override
  String paywallCtaWithPrice(String price) {
    return 'Passer à Pro pour $price/mois';
  }

  @override
  String get paywallPurchaseSuccess => 'Passage à Pro réussi';

  @override
  String get paywallPurchaseFailed =>
      'Échec de l\'achat. Veuillez réessayer plus tard';

  @override
  String get commonRetry => 'Réessayer';

  @override
  String get commonCancel => 'Annuler';

  @override
  String get commonConfirm => 'Confirmer';

  @override
  String get commonBack => 'Retour';

  @override
  String get commonPin => 'Protéger';

  @override
  String get commonUnpin => 'Retirer la protection';
}
