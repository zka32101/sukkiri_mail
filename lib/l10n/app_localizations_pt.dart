// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Portuguese (`pt`).
class AppLocalizationsPt extends AppLocalizations {
  AppLocalizationsPt([String locale = 'pt']) : super(locale);

  @override
  String get appTitle => 'Caixa Leve';

  @override
  String get onboardingTitle =>
      'Liberte-se dos e-mails que você nunca precisou ver';

  @override
  String get onboardingSubtitle =>
      'Reúna Gmail, Outlook e outros em uma única caixa e arquive o ruído automaticamente';

  @override
  String get onboardingCta => 'Começar';

  @override
  String get accountLinkTitle => 'Vincular uma conta de e-mail';

  @override
  String get accountLinkGmail => 'Conectar Gmail';

  @override
  String get accountLinkOutlook => 'Conectar Outlook / Hotmail';

  @override
  String get accountLinkImap => 'Outro e-mail (Yahoo!, iCloud, etc.)';

  @override
  String scanResultTitle(int count) {
    return 'Encontramos $count e-mails que você não precisa ver';
  }

  @override
  String get scanResultSubtitle => 'É assim que sua caixa vai ficar mais leve';

  @override
  String get scanResultCta => 'Arquivar agora';

  @override
  String get archiveCandidatesTitle => 'Candidatos a arquivamento';

  @override
  String get archiveCandidatesArchiveAll => 'Arquivar tudo';

  @override
  String get archiveCandidatesPin => 'Proteger';

  @override
  String get dashboardTitle => 'Leveza da caixa de entrada';

  @override
  String get dashboardArchivedCount => 'Total arquivado';

  @override
  String get dashboardFreedBytes => 'Espaço local liberado';

  @override
  String get dashboardPinnedCount => 'E-mails protegidos';

  @override
  String get ruleSettingsTitle => 'Regras';

  @override
  String get ruleSettingsCategoryTab => 'Regras por categoria';

  @override
  String get ruleSettingsSenderBlockTab => 'Bloqueio de remetente';

  @override
  String get ruleSettingsAddRule => 'Adicionar regra';

  @override
  String get archiveRestoreTitle => 'E-mails arquivados';

  @override
  String get archiveRestoreRestore => 'Restaurar';

  @override
  String get mailSearchTitle => 'Buscar';

  @override
  String get mailSearchHint => 'Buscar por assunto ou remetente';

  @override
  String get settingsTitle => 'Configurações';

  @override
  String get settingsAccountColor => 'Cor da conta';

  @override
  String get settingsLinkedAccounts => 'Contas vinculadas';

  @override
  String get settingsPlan => 'Plano';

  @override
  String get paywallTitle => 'Caixa Leve Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Contas vinculadas ilimitadas';

  @override
  String get paywallFeatureAutoRules => 'Regras de arquivamento automático';

  @override
  String get paywallFeatureUnlimitedRestore => 'Restauração ilimitada';

  @override
  String get paywallCta => 'Assinar o Pro';

  @override
  String get commonCancel => 'Cancelar';

  @override
  String get commonConfirm => 'Confirmar';

  @override
  String get commonBack => 'Voltar';

  @override
  String get commonPin => 'Proteger';

  @override
  String get commonUnpin => 'Remover proteção';
}

/// The translations for Portuguese, as used in Brazil (`pt_BR`).
class AppLocalizationsPtBr extends AppLocalizationsPt {
  AppLocalizationsPtBr() : super('pt_BR');

  @override
  String get appTitle => 'Caixa Leve';

  @override
  String get onboardingTitle =>
      'Liberte-se dos e-mails que você nunca precisou ver';

  @override
  String get onboardingSubtitle =>
      'Reúna Gmail, Outlook e outros em uma única caixa e arquive o ruído automaticamente';

  @override
  String get onboardingCta => 'Começar';

  @override
  String get accountLinkTitle => 'Vincular uma conta de e-mail';

  @override
  String get accountLinkGmail => 'Conectar Gmail';

  @override
  String get accountLinkOutlook => 'Conectar Outlook / Hotmail';

  @override
  String get accountLinkImap => 'Outro e-mail (Yahoo!, iCloud, etc.)';

  @override
  String scanResultTitle(int count) {
    return 'Encontramos $count e-mails que você não precisa ver';
  }

  @override
  String get scanResultSubtitle => 'É assim que sua caixa vai ficar mais leve';

  @override
  String get scanResultCta => 'Arquivar agora';

  @override
  String get archiveCandidatesTitle => 'Candidatos a arquivamento';

  @override
  String get archiveCandidatesArchiveAll => 'Arquivar tudo';

  @override
  String get archiveCandidatesPin => 'Proteger';

  @override
  String get dashboardTitle => 'Leveza da caixa de entrada';

  @override
  String get dashboardArchivedCount => 'Total arquivado';

  @override
  String get dashboardFreedBytes => 'Espaço local liberado';

  @override
  String get dashboardPinnedCount => 'E-mails protegidos';

  @override
  String get ruleSettingsTitle => 'Regras';

  @override
  String get ruleSettingsCategoryTab => 'Regras por categoria';

  @override
  String get ruleSettingsSenderBlockTab => 'Bloqueio de remetente';

  @override
  String get ruleSettingsAddRule => 'Adicionar regra';

  @override
  String get archiveRestoreTitle => 'E-mails arquivados';

  @override
  String get archiveRestoreRestore => 'Restaurar';

  @override
  String get mailSearchTitle => 'Buscar';

  @override
  String get mailSearchHint => 'Buscar por assunto ou remetente';

  @override
  String get settingsTitle => 'Configurações';

  @override
  String get settingsAccountColor => 'Cor da conta';

  @override
  String get settingsLinkedAccounts => 'Contas vinculadas';

  @override
  String get settingsPlan => 'Plano';

  @override
  String get paywallTitle => 'Caixa Leve Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Contas vinculadas ilimitadas';

  @override
  String get paywallFeatureAutoRules => 'Regras de arquivamento automático';

  @override
  String get paywallFeatureUnlimitedRestore => 'Restauração ilimitada';

  @override
  String get paywallCta => 'Assinar o Pro';

  @override
  String get commonCancel => 'Cancelar';

  @override
  String get commonConfirm => 'Confirmar';

  @override
  String get commonBack => 'Voltar';

  @override
  String get commonPin => 'Proteger';

  @override
  String get commonUnpin => 'Remover proteção';
}
