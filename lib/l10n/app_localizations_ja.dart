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
  String get ruleSettingsSenderBlockPickSender => '取り込み済みの差出人から選択';

  @override
  String get ruleSettingsSenderBlockNoSenders => '取り込み済みの差出人がありません';

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
