// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa([String locale = 'ja']) : super(locale);

  @override
  String get appTitle => 'スッキリメール';

  @override
  String get onboardingTitle => '見なくていいメールから、解放されよう';

  @override
  String get onboardingSubtitle =>
      'Gmail・Outlook・その他のメールを1つにまとめて、営業・通知メールを自動でアーカイブ';

  @override
  String get onboardingCta => 'はじめる';

  @override
  String get accountLinkTitle => 'メールアカウントを連携';

  @override
  String get accountLinkGmail => 'Gmailで連携';

  @override
  String get accountLinkOutlook => 'Outlook / Hotmailで連携';

  @override
  String get accountLinkImap => 'その他のメール（Yahoo!・iCloud等）';

  @override
  String scanResultTitle(int count) {
    return '$count件の見なくていいメールを検出しました';
  }

  @override
  String get scanResultSubtitle => '受信箱がここまですっきりします';

  @override
  String get scanResultCta => 'アーカイブする';

  @override
  String get archiveCandidatesTitle => 'アーカイブ候補';

  @override
  String get archiveCandidatesArchiveAll => 'すべてアーカイブ';

  @override
  String get archiveCandidatesPin => '保護する';

  @override
  String get dashboardTitle => '受信箱スッキリ度';

  @override
  String get dashboardArchivedCount => '累計アーカイブ件数';

  @override
  String get dashboardFreedBytes => '解放したローカル容量';

  @override
  String get dashboardPinnedCount => '保護件数';

  @override
  String get ruleSettingsTitle => 'ルール設定';

  @override
  String get ruleSettingsCategoryTab => 'カテゴリルール';

  @override
  String get ruleSettingsSenderBlockTab => '差出人ブロック';

  @override
  String get ruleSettingsAddRule => 'ルールを追加';

  @override
  String get archiveRestoreTitle => 'アーカイブ済み一覧';

  @override
  String get archiveRestoreRestore => '復元する';

  @override
  String get mailSearchTitle => '検索';

  @override
  String get mailSearchHint => '件名・送信者で検索';

  @override
  String get settingsTitle => '設定';

  @override
  String get settingsAccountColor => 'アカウントカラー';

  @override
  String get settingsLinkedAccounts => '連携アカウント';

  @override
  String get settingsPlan => 'プラン';

  @override
  String get paywallTitle => 'スッキリメール Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => 'アカウント連携無制限';

  @override
  String get paywallFeatureAutoRules => '自動アーカイブルール';

  @override
  String get paywallFeatureUnlimitedRestore => '復元無制限';

  @override
  String get paywallCta => 'Proにアップグレード';

  @override
  String get commonCancel => 'キャンセル';

  @override
  String get commonConfirm => '確認';

  @override
  String get commonBack => '戻る';

  @override
  String get commonPin => '保護';

  @override
  String get commonUnpin => '保護解除';
}
