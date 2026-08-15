import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../viewmodels/linked_account_providers.dart';
import '../viewmodels/local_cache_eviction_providers.dart';
import 'archive_restore_view.dart';
import 'mail_search_view.dart';
import 'onboarding_view.dart';
import 'rule_settings_view.dart';
import 'settings_view.dart';
import 'tidiness_dashboard_view.dart';

/// アカウント未連携ならOnboarding→AccountLink→ScanResult→ArchiveCandidatesの
/// Aha Moment動線へ、連携済みならメインシェル（ボトムナビ）へ分岐する。
class RootShell extends ConsumerWidget {
  const RootShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accountsAsync = ref.watch(linkedAccountsProvider);

    return accountsAsync.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text('$e'))),
      data: (accounts) {
        if (accounts.isEmpty) {
          return const OnboardingView();
        }
        return const _MainShell();
      },
    );
  }
}

class _MainShell extends ConsumerStatefulWidget {
  const _MainShell();

  @override
  ConsumerState<_MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<_MainShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    // メインシェルに到達するたび（アプリセッション中は初回のみ実行・以降は結果をキャッシュ）、
    // ローカルキャッシュの自動削除（Must4）をバックグラウンドで実行する。UIはブロックしない。
    ref.watch(localCacheEvictionSweepProvider);
    final l10n = AppLocalizations.of(context)!;
    final pages = const [
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
