// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Korean (`ko`).
class AppLocalizationsKo extends AppLocalizations {
  AppLocalizationsKo([String locale = 'ko']) : super(locale);

  @override
  String get appTitle => '상쾌메일';

  @override
  String get onboardingTitle => '안 봐도 되는 메일에서 자유로워지세요';

  @override
  String get onboardingSubtitle =>
      'Gmail, Outlook 등을 하나로 모아 광고·알림 메일을 자동으로 보관합니다';

  @override
  String get onboardingCta => '시작하기';

  @override
  String get accountLinkTitle => '메일 계정 연결';

  @override
  String get accountLinkGmail => 'Gmail 연결';

  @override
  String get accountLinkOutlook => 'Outlook / Hotmail 연결';

  @override
  String get accountLinkImap => '기타 메일 (Yahoo!, iCloud 등)';

  @override
  String scanResultTitle(int count) {
    return '안 봐도 되는 메일 $count건을 찾았습니다';
  }

  @override
  String get scanResultSubtitle => '받은편지함이 이렇게 정리됩니다';

  @override
  String get scanResultCta => '지금 보관하기';

  @override
  String get archiveCandidatesTitle => '보관 후보 메일';

  @override
  String get archiveCandidatesArchiveAll => '모두 보관';

  @override
  String get archiveCandidatesPin => '보호하기';

  @override
  String get mailListTitle => '메일 목록';

  @override
  String get mailListEmpty => '표시할 메일이 없습니다';

  @override
  String get mailListSortNewest => '최신순';

  @override
  String get mailListSortUnreadFirst => '읽지 않은 메일 우선';

  @override
  String get mailListSortSender => '보낸 사람별';

  @override
  String get mailListGroupToggle => '보낸 사람별로 그룹화';

  @override
  String mailListSelectionCount(int count) {
    return '$count개 선택됨';
  }

  @override
  String get mailListBulkArchive => '보관';

  @override
  String get mailListBulkMarkRead => '읽음으로 표시';

  @override
  String get mailListUnknownSender => '(알 수 없는 발신자)';

  @override
  String get categoryAll => '전체';

  @override
  String get categoryPromotion => '프로모션';

  @override
  String get categoryNotification => '알림';

  @override
  String get categoryInvoice => '청구서';

  @override
  String get categoryOther => '기타';

  @override
  String get dashboardArchivedCount => '누적 보관 건수';

  @override
  String get dashboardFreedBytes => '확보한 저장공간';

  @override
  String get dashboardPinnedCount => '보호된 메일 수';

  @override
  String get ruleSettingsTitle => '규칙 설정';

  @override
  String get ruleSettingsCategoryTab => '카테고리 규칙';

  @override
  String get ruleSettingsSenderBlockTab => '발신자 차단';

  @override
  String get ruleSettingsAddRule => '규칙 추가';

  @override
  String get archiveRestoreTitle => '보관된 메일';

  @override
  String get archiveRestoreRestore => '복원';

  @override
  String get mailSearchTitle => '검색';

  @override
  String get mailSearchHint => '제목이나 발신자로 검색';

  @override
  String get settingsTitle => '설정';

  @override
  String get settingsAccountColor => '계정 색상';

  @override
  String get settingsLinkedAccounts => '연결된 계정';

  @override
  String get settingsPlan => '요금제';

  @override
  String get paywallTitle => '상쾌메일 Pro';

  @override
  String get paywallFeatureUnlimitedAccounts => '계정 연결 무제한';

  @override
  String get paywallFeatureAutoRules => '자동 보관 규칙';

  @override
  String get paywallFeatureUnlimitedRestore => '복원 무제한';

  @override
  String get paywallCta => 'Pro로 업그레이드';

  @override
  String get commonCancel => '취소';

  @override
  String get commonConfirm => '확인';

  @override
  String get commonBack => '뒤로';

  @override
  String get commonPin => '보호';

  @override
  String get commonUnpin => '보호 해제';
}
