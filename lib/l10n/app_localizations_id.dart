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
  String get ruleSettingsSenderBlockPickSender => '取り込み済みの差出人から選択';

  @override
  String get ruleSettingsSenderBlockNoSenders => '取り込み済みの差出人がありません';

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
  String get paywallTitle => 'Kotak Rapi Pro';

  @override
  String get paywallFeatureAdFree => 'Bebas iklan';

  @override
  String get paywallFeatureUnlimitedAccounts => 'Akun terhubung tanpa batas';

  @override
  String get paywallFeatureAutoRules => 'Aturan pengarsipan otomatis';

  @override
  String get paywallFeatureUnlimitedRestore => 'Pemulihan tanpa batas';

  @override
  String get paywallCta => 'Upgrade ke Pro';

  @override
  String paywallCtaWithPrice(String price) {
    return 'Upgrade ke Pro seharga $price/bln';
  }

  @override
  String get paywallPurchaseSuccess => 'Berhasil upgrade ke Pro';

  @override
  String get paywallPurchaseFailed =>
      'Pembelian gagal. Silakan coba lagi nanti';

  @override
  String get settingsSyncInterval => 'Interval sinkronisasi otomatis';

  @override
  String settingsSyncIntervalHours(int hours) {
    return 'Setiap $hours jam';
  }

  @override
  String get settingsAccountReauthRequired => 'Perlu sambungkan ulang';

  @override
  String get settingsAccountUnlink => 'Putuskan tautan';

  @override
  String settingsAccountUnlinkConfirm(String email) {
    return 'Putuskan tautan $email? Email yang sudah diimpor akan tetap ada di aplikasi.';
  }

  @override
  String get notificationSettingsTitle => 'Pengirim untuk notifikasi';

  @override
  String get notificationSettingsDescription =>
      'Anda hanya akan diberi tahu tentang email baru dari pengirim yang dipilih. Jika tidak ada yang dipilih, notifikasi tidak akan dikirim.';

  @override
  String get notificationSettingsEmpty => 'Belum ada email yang diimpor';

  @override
  String get commonRetry => 'Coba lagi';

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
