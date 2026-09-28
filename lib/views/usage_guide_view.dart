import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

/// アプリの使い方説明画面。起動時に一度だけ自動表示され（RootShell参照）、
/// 以降は設定タブの「使い方」からいつでも開ける（強制ゲートではない）。
class UsageGuideView extends StatelessWidget {
  const UsageGuideView({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final bullets = [
      l10n.usageGuideBulletAutoHide,
      l10n.usageGuideBulletDetail,
      l10n.usageGuideBulletBlock,
      l10n.usageGuideBulletMultiAccount,
    ];

    return Scaffold(
      appBar: AppBar(title: Text(l10n.usageGuideTitle)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.usageGuideIntro,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 24),
              Expanded(
                child: ListView(
                  children: bullets
                      .map(
                        (b) => Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.check_circle_outline, size: 20),
                              const SizedBox(width: 12),
                              Expanded(child: Text(b)),
                            ],
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  child: Text(l10n.usageGuideClose),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
