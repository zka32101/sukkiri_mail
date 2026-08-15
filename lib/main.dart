import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'l10n/app_localizations.dart';
import 'theme/app_theme.dart';
import 'views/root_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Firebase設定ファイル（iOS: GoogleService-Info.plist、Android: google-services.json）が
  // 欠落している等でinitializeAppが失敗した場合、ここでcatchせずにいると runApp が一度も
  // 呼ばれず、起動画面（スプラッシュ）から一切先に進まないまま無言でフリーズ/クラッシュする。
  // 必ず runApp までは到達させ、失敗時はエラー内容を画面に表示する。
  Object? initError;
  try {
    await Firebase.initializeApp();
  } catch (e) {
    initError = e;
  }
  runApp(
    initError == null
        ? const ProviderScope(child: SukkiriMailApp())
        : _StartupErrorApp(error: initError),
  );
}

/// Firebase初期化失敗時のフォールバック画面。
/// アプリ本体（Riverpod/Firestore等に依存する画面）は一切構築しない。
class _StartupErrorApp extends StatelessWidget {
  const _StartupErrorApp({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  const Text(
                    'アプリの初期化に失敗しました',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Firebaseへの接続設定に問題がある可能性があります。'
                    '開発者にお問い合わせください。',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '$error',
                    style: Theme.of(
                      context,
                    ).textTheme.bodySmall?.copyWith(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class SukkiriMailApp extends StatelessWidget {
  const SukkiriMailApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      onGenerateTitle: (context) => AppLocalizations.of(context)!.appTitle,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      home: const RootShell(),
    );
  }
}
