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
  String get dashboardArchivedCount => 'Total arquivado';

  @override
  String get dashboardFreedBytes => 'Espaço local liberado';

  @override
  String get dashboardPinnedCount => 'E-mails protegidos';

  @override
  String get mailListTitle => 'Lista de e-mails';

  @override
  String get mailListEmpty => 'Nenhum e-mail para mostrar';

  @override
  String get mailListSortNewest => 'Mais recentes';

  @override
  String get mailListSortUnreadFirst => 'Não lidos primeiro';

  @override
  String get mailListSortSender => 'Por remetente';

  @override
  String get mailListGroupToggle => 'Agrupar por remetente';

  @override
  String mailListSelectionCount(int count) {
    return '$count selecionado(s)';
  }

  @override
  String get mailListBulkArchive => 'Arquivar';

  @override
  String get mailListBulkMarkRead => 'Marcar como lido';

  @override
  String get mailListUnknownSender => '(Remetente desconhecido)';

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
  String get categoryAll => 'Todos';

  @override
  String get categoryPromotion => 'Promoções';

  @override
  String get categoryNotification => 'Notificações';

  @override
  String get categoryInvoice => 'Faturas';

  @override
  String get categoryOther => 'Outros';

  @override
  String get ruleSettingsTitle => 'Regras';

  @override
  String get ruleSettingsCategoryTab => 'Regras por categoria';

  @override
  String get ruleSettingsSenderBlockTab => 'Bloqueio de remetente';

  @override
  String get ruleSettingsAddRule => 'Adicionar regra';

  @override
  String get ruleSettingsSenderBlockPickSender => '取り込み済みの差出人から選択';

  @override
  String get ruleSettingsSenderBlockNoSenders => '取り込み済みの差出人がありません';

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
  String get settingsUsageGuide => '使い方';

  @override
  String get settingsSyncInterval => 'Intervalo de sincronização automática';

  @override
  String settingsSyncIntervalHours(int hours) {
    return 'A cada $hours horas';
  }

  @override
  String get settingsAccountReauthRequired => 'É necessário reconectar';

  @override
  String get settingsAccountUnlink => 'Desvincular';

  @override
  String settingsAccountUnlinkConfirm(String email) {
    return 'Desvincular $email? Os e-mails já importados permanecerão na aplicação.';
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
  String get notificationSettingsTitle => 'Remetentes para notificar';

  @override
  String get notificationSettingsDescription =>
      'Só será notificado sobre novos e-mails dos remetentes selecionados. Se nenhum for selecionado, nenhuma notificação será enviada.';

  @override
  String get notificationSettingsEmpty => 'Ainda não há e-mails importados';

  @override
  String get paywallTitle => 'Caixa Leve Pro';

  @override
  String get paywallFeatureAdFree => 'Sem anúncios';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Contas vinculadas ilimitadas';

  @override
  String get paywallFeatureAutoRules => 'Regras de arquivamento automático';

  @override
  String get paywallFeatureUnlimitedRestore => 'Restauração ilimitada';

  @override
  String get paywallCta => 'Assinar o Pro';

  @override
  String paywallCtaWithPrice(String price) {
    return 'Assinar o Pro por $price/mês';
  }

  @override
  String get paywallPurchaseSuccess =>
      'Atualização para Pro concluída com sucesso';

  @override
  String get paywallPurchaseFailed =>
      'Falha na compra. Tente novamente mais tarde';

  @override
  String get commonRetry => 'Tentar novamente';

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
  String get dashboardArchivedCount => 'Total arquivado';

  @override
  String get dashboardFreedBytes => 'Espaço local liberado';

  @override
  String get dashboardPinnedCount => 'E-mails protegidos';

  @override
  String get mailListTitle => 'Lista de e-mails';

  @override
  String get mailListEmpty => 'Nenhum e-mail para mostrar';

  @override
  String get mailListSortNewest => 'Mais recentes';

  @override
  String get mailListSortUnreadFirst => 'Não lidos primeiro';

  @override
  String get mailListSortSender => 'Por remetente';

  @override
  String get mailListGroupToggle => 'Agrupar por remetente';

  @override
  String mailListSelectionCount(int count) {
    return '$count selecionado(s)';
  }

  @override
  String get mailListBulkArchive => 'Arquivar';

  @override
  String get mailListBulkMarkRead => 'Marcar como lido';

  @override
  String get mailListUnknownSender => '(Remetente desconhecido)';

  @override
  String get categoryAll => 'Todos';

  @override
  String get categoryPromotion => 'Promoções';

  @override
  String get categoryNotification => 'Notificações';

  @override
  String get categoryInvoice => 'Faturas';

  @override
  String get categoryOther => 'Outros';

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
  String get settingsSyncInterval => 'Intervalo de sincronização automática';

  @override
  String settingsSyncIntervalHours(int hours) {
    return 'A cada $hours horas';
  }

  @override
  String get settingsAccountReauthRequired => 'É necessário reconectar';

  @override
  String get settingsAccountUnlink => 'Desvincular';

  @override
  String settingsAccountUnlinkConfirm(String email) {
    return 'Desvincular $email? Os e-mails já importados permanecerão no aplicativo.';
  }

  @override
  String get notificationSettingsTitle => 'Remetentes para notificar';

  @override
  String get notificationSettingsDescription =>
      'Você só será notificado sobre novos e-mails dos remetentes selecionados. Se nenhum for selecionado, nenhuma notificação será enviada.';

  @override
  String get notificationSettingsEmpty => 'Ainda não há e-mails importados';

  @override
  String get paywallTitle => 'Caixa Leve Pro';

  @override
  String get paywallFeatureAdFree => 'Sem anúncios';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Contas vinculadas ilimitadas';

  @override
  String get paywallFeatureAutoRules => 'Regras de arquivamento automático';

  @override
  String get paywallFeatureUnlimitedRestore => 'Restauração ilimitada';

  @override
  String get paywallCta => 'Assinar o Pro';

  @override
  String paywallCtaWithPrice(String price) {
    return 'Assinar o Pro por $price/mês';
  }

  @override
  String get paywallPurchaseSuccess => 'Upgrade para Pro concluído com sucesso';

  @override
  String get paywallPurchaseFailed =>
      'Falha na compra. Tente novamente mais tarde';

  @override
  String get commonRetry => 'Tentar novamente';

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
