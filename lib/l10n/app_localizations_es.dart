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
  String get mailListTitle => 'Lista de correos';

  @override
  String get mailListEmpty => 'No hay correos para mostrar';

  @override
  String get mailListSortNewest => 'Más recientes';

  @override
  String get mailListSortUnreadFirst => 'No leídos primero';

  @override
  String get mailListSortSender => 'Por remitente';

  @override
  String get mailListGroupToggle => 'Agrupar por remitente';

  @override
  String mailListSelectionCount(int count) {
    return '$count seleccionados';
  }

  @override
  String get mailListBulkArchive => 'Archivar';

  @override
  String get mailListBulkMarkRead => 'Marcar como leído';

  @override
  String get mailListUnknownSender => '(Remitente desconocido)';

  @override
  String get categoryAll => 'Todos';

  @override
  String get categoryPromotion => 'Promociones';

  @override
  String get categoryNotification => 'Notificaciones';

  @override
  String get categoryInvoice => 'Facturas';

  @override
  String get categoryOther => 'Otros';

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
  String get paywallTitle => 'Bandeja Ligera Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Cuentas vinculadas ilimitadas';

  @override
  String get paywallFeatureAutoRules => 'Reglas de archivado automático';

  @override
  String get paywallFeatureUnlimitedRestore => 'Restauración ilimitada';

  @override
  String get paywallCta => 'Mejorar a Pro';

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
