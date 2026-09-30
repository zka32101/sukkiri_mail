import 'package:cloud_functions/cloud_functions.dart';

/// ルール管理用のCloud Functions呼び出しサービス
class RuleService {
  final FirebaseFunctions _functions;

  RuleService({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instance;

  /// カテゴリルールの保持日数を更新する
  ///
  /// Parameters:
  /// - ruleId: 更新対象のルールID
  /// - retentionDays: 新しい保持日数（1～90日）
  ///
  /// Returns: {ok: true, ruleId: String, retentionDays: int}
  Future<Map<String, dynamic>> updateCategoryRule({
    required String ruleId,
    required int retentionDays,
  }) async {
    try {
      final callable = _functions.httpsCallable('updateCategoryRule');
      final result = await callable.call<Map<String, dynamic>>({
        'ruleId': ruleId,
        'retentionDays': retentionDays,
      });
      return result.data;
    } catch (e) {
      rethrow;
    }
  }
}
