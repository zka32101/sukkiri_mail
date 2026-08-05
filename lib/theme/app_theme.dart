import 'package:flutter/material.dart';

/// 「見なくていいメール」訴求文言の徹底に合わせた、落ち着いた整理整頓感のあるトーン。
/// 背景白無地NG：淡いニュートラルグレーをベースに使う。
class AppTheme {
  static const _seed = Color(0xFF3457C9);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(seedColor: _seed, brightness: Brightness.light);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFFF4F6FA),
      appBarTheme: const AppBarTheme(centerTitle: false, elevation: 0),
    );
  }

  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(seedColor: _seed, brightness: Brightness.dark);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      appBarTheme: const AppBarTheme(centerTitle: false, elevation: 0),
    );
  }

  /// アカウントカラーはダークモードで彩度を下げた同系色にする。
  static Color accountColorFor(String hex, Brightness brightness) {
    final color = Color(int.parse(hex.replaceFirst('#', '0xFF')));
    if (brightness == Brightness.light) return color;
    final hsl = HSLColor.fromColor(color);
    return hsl.withSaturation((hsl.saturation * 0.7).clamp(0.0, 1.0)).toColor();
  }
}
