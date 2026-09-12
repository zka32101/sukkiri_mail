import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/ml_model.dart';
import '../repositories/ml_model_repository.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

/// ML Model Repository プロバイダ
final mlModelRepositoryProvider = Provider((ref) {
  return MLModelRepository();
});

/// ユーザーのすべての ML モデルを監視
final mlModelsProvider = StreamProvider.autoDispose((ref) async* {
  final userId = await ref.watch(currentUserIdProvider.future);
  final repo = ref.watch(mlModelRepositoryProvider);
  yield* repo.watchModelsForUser(userId);
});

/// 本番環境の分類モデルを取得
final productionCategorizationModelProvider = FutureProvider.autoDispose((ref) async {
  final userId = await ref.watch(currentUserIdProvider.future);
  final repo = ref.watch(mlModelRepositoryProvider);
  return await repo.getProductionModel(userId, MLModelType.categorization);
});

/// ステージングの分類モデルを取得（A/B テスト用）
final stagingCategorizationModelProvider = FutureProvider.autoDispose((ref) async {
  final userId = await ref.watch(currentUserIdProvider.future);
  final repo = ref.watch(mlModelRepositoryProvider);

  final allModels = await ref.watch(mlModelsProvider.future);
  return allModels.firstWhere(
    (m) => m.type == MLModelType.categorization && m.status == MLModelStatus.staging,
    orElse: () => MLModel(
      id: '',
      name: 'None',
      type: MLModelType.categorization,
      version: '',
      status: MLModelStatus.archived,
      createdAt: DateTime.now(),
    ),
  );
});

/// ML 推論統計（ダッシュボード用）
class MLInferenceStats {
  final int totalInferences;
  final double averageLatencyMs;
  final double? accuracyScore;
  final DateTime lastUpdated;

  MLInferenceStats({
    required this.totalInferences,
    required this.averageLatencyMs,
    this.accuracyScore,
    required this.lastUpdated,
  });
}

/// 本番モデルの推論統計
final productionModelStatsProvider = FutureProvider.autoDispose((ref) async {
  final model = await ref.watch(productionCategorizationModelProvider.future);

  if (model == null) {
    return MLInferenceStats(
      totalInferences: 0,
      averageLatencyMs: 0,
      accuracyScore: null,
      lastUpdated: DateTime.now(),
    );
  }

  return MLInferenceStats(
    totalInferences: model.totalInferences ?? 0,
    averageLatencyMs: model.averageLatencyMs ?? 0,
    accuracyScore: model.accuracyScore,
    lastUpdated: model.deployedAt ?? model.createdAt,
  );
});

/// ML モデルの健全性チェック
enum MLModelHealth {
  healthy, // 推論成功率 > 95%、レイテンシ < 500ms
  warning, // 推論成功率 > 80%、レイテンシ > 500ms
  critical, // 推論成功率 < 80% または Vertex AI 接続エラー
}

/// ステージング vs 本番モデルの精度比較
class MLModelComparison {
  final MLModel? productionModel;
  final MLModel? stagingModel;
  final double accuracyDifference; // staging - production
  final bool stagingIsBetter;

  MLModelComparison({
    required this.productionModel,
    required this.stagingModel,
    required this.accuracyDifference,
    required this.stagingIsBetter,
  });
}

/// A/B テスト用の モデル比較プロバイダ
final mlModelComparisonProvider = FutureProvider.autoDispose((ref) async {
  final prodModel = await ref.watch(productionCategorizationModelProvider.future);
  final stagingModel = await ref.watch(stagingCategorizationModelProvider.future);

  final prodAccuracy = prodModel?.accuracyScore ?? 0.0;
  final stagingAccuracy = (stagingModel?.id ?? '').isNotEmpty
    ? (stagingModel?.accuracyScore ?? 0.0)
    : 0.0;

  final diff = stagingAccuracy - prodAccuracy;

  return MLModelComparison(
    productionModel: prodModel,
    stagingModel: (stagingModel?.id ?? '').isNotEmpty ? stagingModel : null,
    accuracyDifference: diff,
    stagingIsBetter: diff > 0,
  );
});
