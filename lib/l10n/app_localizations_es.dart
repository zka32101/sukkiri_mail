// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'Bandeja Ligera';

  @override
  String get onboardingTitle =>
      'Libérate de los correos que nunca necesitaste ver';

  @override
  String get onboardingSubtitle =>
      'Reúne Gmail, Outlook y más en una sola bandeja y archiva automáticamente el ruido';

  @override
  String get onboardingCta => 'Empezar';

  @override
  String get accountLinkTitle => 'Vincular una cuenta de correo';

  @override
  String get accountLinkGmail => 'Conectar Gmail';

  @override
  String get accountLinkOutlook => 'Conectar Outlook / Hotmail';

  @override
  String get accountLinkImap => 'Otro correo (Yahoo!, iCloud, etc.)';

  @override
  String scanResultTitle(int count) {
    return 'Se encontraron $count correos que no necesitas ver';
  }

  @override
  String get scanResultSubtitle => 'Así de ligera quedará tu bandeja';

  @override
  String get scanResultCta => 'Archivar ahora';

  @override
  String get archiveCandidatesTitle => 'Candidatos a archivar';

  @override
  String get archiveCandidatesArchiveAll => 'Archivar todo';

  @override
  String get archiveCandidatesPin => 'Proteger';

  @override
  String get mailListTitle => 'メール一覧';

  @override
  String get mailListEmpty => '表示できるメールがありません';

  @override
  String get mailListPinToggleOn => '保護する';

  @override
  String get mailListPinToggleOff => '保護を解除';

  @override
  String get mailListBlockSender => 'この差出人を今後取り込まない';

  @override
  String get mailListSortByAccount => 'アカウント毎';

  @override
  String get mailListSortByDate => '日付順（全アカウント）';

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
  String get dashboardTitle => 'Nivel de orden de tu bandeja';

  @override
  String get dashboardArchivedCount => 'Total archivado';

  @override
  String get dashboardFreedBytes => 'Espacio local liberado';

  @override
  String get dashboardPinnedCount => 'Correos protegidos';

  @override
  String get ruleSettingsTitle => 'Reglas';

  @override
  String get ruleSettingsCategoryTab => 'Reglas por categoría';

  @override
  String get ruleSettingsSenderBlockTab => 'Bloqueo de remitentes';

  @override
  String get ruleSettingsAddRule => 'Añadir regla';

  @override
  String get ruleSettingsSenderBlockPickSender => '取り込み済みの差出人から選択';

  @override
  String get ruleSettingsSenderBlockNoSenders => '取り込み済みの差出人がありません';

  @override
  String get archiveRestoreTitle => 'Correos archivados';

  @override
  String get archiveRestoreRestore => 'Restaurar';

  @override
  String get mailSearchTitle => 'Buscar';

  @override
  String get mailSearchHint => 'Buscar por asunto o remitente';

  @override
  String get settingsTitle => 'Ajustes';

  @override
  String get settingsAccountColor => 'Color de cuenta';

  @override
  String get settingsLinkedAccounts => 'Cuentas vinculadas';

  @override
  String get settingsPlan => 'Plan';

  @override
  String get settingsUsageGuide => '使い方';

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
  String get paywallTitle => 'Bandeja Ligera Pro';

  @override
  String get paywallFeatureAdFree => 'Sin anuncios';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Cuentas vinculadas ilimitadas';

  @override
  String get paywallFeatureAutoRules => 'Reglas de archivado automático';

  @override
  String get paywallFeatureUnlimitedRestore => 'Restauración ilimitada';

  @override
  String get paywallCta => 'Mejorar a Pro';

  @override
  String paywallCtaWithPrice(String price) {
    return 'Mejorar a Pro por $price/mes';
  }

  @override
  String get paywallPurchaseSuccess => 'Actualizado a Pro correctamente';

  @override
  String get paywallPurchaseFailed =>
      'Error en la compra. Inténtalo de nuevo más tarde';

  @override
  String get settingsSyncInterval => 'Intervalo de sincronización automática';

  @override
  String settingsSyncIntervalHours(int hours) {
    return 'Cada $hours horas';
  }

  @override
  String get settingsAccountReauthRequired => 'Se requiere reconexión';

  @override
  String get settingsAccountUnlink => 'Desvincular';

  @override
  String settingsAccountUnlinkConfirm(String email) {
    return '¿Desvincular $email? El correo ya importado permanecerá en la app.';
  }

  @override
  String get notificationSettingsTitle => 'Remitentes para notificar';

  @override
  String get notificationSettingsDescription =>
      'Solo se te notificará sobre correos nuevos de los remitentes seleccionados. Si no seleccionas ninguno, no se enviarán notificaciones.';

  @override
  String get notificationSettingsEmpty => 'Aún no se han importado correos';

  @override
  String get commonRetry => 'Reintentar';

  @override
  String get commonCancel => 'Cancelar';

  @override
  String get commonConfirm => 'Confirmar';

  @override
  String get commonBack => 'Atrás';

  @override
  String get commonPin => 'Proteger';

  @override
  String get commonUnpin => 'Quitar protección';
}
