import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../l10n/app_localizations.dart';
import 'archive_restore_view.dart';
import 'mail_list_view.dart';
import 'mail_search_view.dart';
import 'rule_settings_view.dart';
import 'settings_view.dart';
import 'tidiness_dashboard_view.dart';
import 'usage_guide_view.dart';

/// 初回起動判定用フラグ。値を変えれば説明内容の大改訂時に再表示させられる。
const _hasSeenUsageGuideKey = 'hasSeenUsageGuideV1';

/// 起動直後に必ずメール一覧（メインシェル・ボトムナビ）を表示する。
/// アカウント未連携でもここへ入り、連携はSettingsタブの「アカウントを追加」
/// からいつでもたどれる（Onboardingの必須ゲートは廃止）。
class RootShell extends StatelessWidget {
  const RootShell({super.key});

  @override
  Widget build(BuildContext context) {
    return const _MainShell();
  }
}

class _MainShell extends StatefulWidget {
  const _MainShell();

  @override
  State<_MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<_MainShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeShowUsageGuide());
  }

  Future<void> _maybeShowUsageGuide() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_hasSeenUsageGuideKey) == true) return;
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => const UsageGuideView(),
      ),
    );
    await prefs.setBool(_hasSeenUsageGuideKey, true);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final pages = const [
      MailListView(),
      TidinessDashboardView(),
      RuleSettingsView(),
      ArchiveRestoreView(),
      MailSearchView(),
      SettingsView(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.mail_outline),
            label: l10n.mailListTitle,
          ),
          NavigationDestination(
            icon: const Icon(Icons.dashboard_outlined),
            label: l10n.dashboardTitle,
          ),
          NavigationDestination(
            icon: const Icon(Icons.rule_outlined),
            label: l10n.ruleSettingsTitle,
          ),
          NavigationDestination(
            icon: const Icon(Icons.archive_outlined),
            label: l10n.archiveRestoreTitle,
          ),
          NavigationDestination(
            icon: const Icon(Icons.search_outlined),
            label: l10n.mailSearchTitle,
          ),
          NavigationDestination(
            icon: const Icon(Icons.settings_outlined),
            label: l10n.settingsTitle,
          ),
        ],
      ),
    );
  }
}
