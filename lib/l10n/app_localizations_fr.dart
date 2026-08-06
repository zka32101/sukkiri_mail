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
  String get dashboardTitle => 'Sérénité de la boîte de réception';

  @override
  String get dashboardArchivedCount => 'Total archivé';

  @override
  String get dashboardFreedBytes => 'Espace local libéré';

  @override
  String get dashboardPinnedCount => 'E-mails protégés';

  @override
  String get ruleSettingsTitle => 'Règles';

  @override
  String get ruleSettingsCategoryTab => 'Règles par catégorie';

  @override
  String get ruleSettingsSenderBlockTab => 'Blocage d\'expéditeur';

  @override
  String get ruleSettingsAddRule => 'Ajouter une règle';

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
  String get paywallTitle => 'Boîte Zen Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Comptes liés illimités';

  @override
  String get paywallFeatureAutoRules => 'Règles d\'archivage automatique';

  @override
  String get paywallFeatureUnlimitedRestore => 'Restauration illimitée';

  @override
  String get paywallCta => 'Passer à Pro';

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
