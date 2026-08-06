// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Indonesian (`id`).
class AppLocalizationsId extends AppLocalizations {
  AppLocalizationsId([String locale = 'id']) : super(locale);

  @override
  String get appTitle => 'Kotak Rapi';

  @override
  String get onboardingTitle => 'Bebas dari email yang tak perlu kamu lihat';

  @override
  String get onboardingSubtitle =>
      'Gabungkan Gmail, Outlook, dan lainnya jadi satu kotak masuk, lalu arsipkan promosi/notifikasi otomatis';

  @override
  String get onboardingCta => 'Mulai';

  @override
  String get accountLinkTitle => 'Hubungkan akun email';

  @override
  String get accountLinkGmail => 'Hubungkan Gmail';

  @override
  String get accountLinkOutlook => 'Hubungkan Outlook / Hotmail';

  @override
  String get accountLinkImap => 'Email lain (Yahoo!, iCloud, dll.)';

  @override
  String scanResultTitle(int count) {
    return 'Ditemukan $count email yang tak perlu kamu lihat';
  }

  @override
  String get scanResultSubtitle => 'Begini rapinya kotak masukmu nanti';

  @override
  String get scanResultCta => 'Arsipkan sekarang';

  @override
  String get archiveCandidatesTitle => 'Kandidat arsip';

  @override
  String get archiveCandidatesArchiveAll => 'Arsipkan semua';

  @override
  String get archiveCandidatesPin => 'Lindungi';

  @override
  String get dashboardTitle => 'Kerapian kotak masuk';

  @override
  String get dashboardArchivedCount => 'Total diarsipkan';

  @override
  String get dashboardFreedBytes => 'Ruang lokal yang dibebaskan';

  @override
  String get dashboardPinnedCount => 'Email terlindungi';

  @override
  String get ruleSettingsTitle => 'Aturan';

  @override
  String get ruleSettingsCategoryTab => 'Aturan kategori';

  @override
  String get ruleSettingsSenderBlockTab => 'Blokir pengirim';

  @override
  String get ruleSettingsAddRule => 'Tambah aturan';

  @override
  String get archiveRestoreTitle => 'Email terarsip';

  @override
  String get archiveRestoreRestore => 'Pulihkan';

  @override
  String get mailSearchTitle => 'Cari';

  @override
  String get mailSearchHint => 'Cari berdasarkan subjek atau pengirim';

  @override
  String get settingsTitle => 'Pengaturan';

  @override
  String get settingsAccountColor => 'Warna akun';

  @override
  String get settingsLinkedAccounts => 'Akun terhubung';

  @override
  String get settingsPlan => 'Paket';

  @override
  String get paywallTitle => 'Kotak Rapi Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Akun terhubung tanpa batas';

  @override
  String get paywallFeatureAutoRules => 'Aturan pengarsipan otomatis';

  @override
  String get paywallFeatureUnlimitedRestore => 'Pemulihan tanpa batas';

  @override
  String get paywallCta => 'Upgrade ke Pro';

  @override
  String get commonCancel => 'Batal';

  @override
  String get commonConfirm => 'Konfirmasi';

  @override
  String get commonBack => 'Kembali';

  @override
  String get commonPin => 'Lindungi';

  @override
  String get commonUnpin => 'Batalkan perlindungan';
}
