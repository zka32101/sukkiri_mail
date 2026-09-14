import 'package:cloud_functions/cloud_functions.dart';

/// キャッシュ管理用のCloud Functions呼び出しサービス
class CacheStatsService {
  final FirebaseFunctions _functions;

  CacheStatsService({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instance;

  /// ユーザーの現在のキャッシュ統計情報を取得する
  ///
  /// Returns: {
  ///   ok: true,
  ///   stats: {
  ///     count: int,           // キャッシュ済みメール数
  ///     totalBytes: int,      // ストレージ使用量（バイト）
  ///     byStatus: Map,        // ステータス別メール数
  ///     totalEmails: int      // 全メール数
  ///   }
  /// }
  Future<Map<String, dynamic>> getCacheStats() async {
    try {
      final callable = _functions.httpsCallable('getCacheStats');
      final result = await callable.call<Map<String, dynamic>>({});
      return result.data ?? {};
    } catch (e) {
      rethrow;
    }
  }
}
