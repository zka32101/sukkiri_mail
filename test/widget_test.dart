// アプリ起動のスモークテスト。
// Firebase未初期化のテスト環境では起動時にFirebase.initializeApp()が失敗するため、
// main.dart全体ではなくSukkiriMailApp単体をProviderScope配下でpumpし、
// クラッシュせずに最初のフレームが描画されることのみを確認する。

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:sukkiri_mail/main.dart';

void main() {
  testWidgets('SukkiriMailApp builds without throwing', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: SukkiriMailApp()));
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
