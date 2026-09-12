import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/ml_model.dart';
import 'core_providers.dart';

/// 指定ユーザーのすべての ML モデルを監視（リアルタイム）。
/// 作成日順で降順に並べる。
final mlModelsProvider = StreamProvider.family<List<MLModel>, String>((
  ref,
  userId,
) {
  final repo = ref.watch(mlModelRepositoryProvider);
  return repo.watchModelsForUser(userId);
});

/// 指定ユーザーの本番環境 ML モデルを取得。
/// カテゴリ分類用の production ステータスモデルを返す。
/// モデルが存在しない場合は null を返す。
final productionCategorizationModelProvider =
    FutureProvider.family<MLModel?, String>((
  ref,
  userId,
) async {
  final repo = ref.watch(mlModelRepositoryProvider);
  return await repo.getProductionModel(userId, MLModelType.categorization);
});

/// 指定ユーザーのステージング ML モデルを取得。
/// A/B テスト用のステージングモデル。
/// 複数ある場合は最新のものを返す。
final stagingCategorizationModelProvider =
    FutureProvider.family<MLModel?, String>((
  ref,
  userId,
) async {
  final repo = ref.watch(mlModelRepositoryProvider);
  final models = await repo.watchModelsByStatus(
    userId,
    MLModelStatus.staging,
  ).first;

  // カテゴリ分類タイプでフィルター
  final categorizationModels = models
      .where((m) => m.type == MLModelType.categorization)
      .toList();

  if (categorizationModels.isEmpty) return null;

  // 最新のものを返す（createdAtで降順）
  categorizationModels.sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return categorizationModels.first;
});

/// ML モデル統計情報。推論結果の分析用。
class MLInferenceStats {
  final int totalInferences;
  final double averageLatencyMs;
  final double? accuracyScore;
  final double? stagingAccuracyScore;

  /// 本番 vs ステージング の精度向上度（パーセント）。
  /// 正の値: ステージングが優秀、負の値: 本番が優秀。
  double get accuracyImprovement {
    if (accuracyScore == null || stagingAccuracyScore == null) return 0.0;
    return (stagingAccuracyScore! - accuracyScore!) * 100;
  }

  MLInferenceStats({
    required this.totalInferences,
    required this.averageLatencyMs,
    this.accuracyScore,
    this.stagingAccuracyScore,
  });
}

/// 本番環境モデル vs ステージングモデルの性能比較。
/// A/B テスト検証に使用。
final mlModelComparisonProvider =
    FutureProvider.family<MLInferenceStats?, String>((
  ref,
  userId,
) async {
  final prodModelAsync =
      ref.watch(productionCategorizationModelProvider(userId));
  final stagingModelAsync =
      ref.watch(stagingCategorizationModelProvider(userId));

  final prodModel = prodModelAsync.when(
    data: (model) => model,
    loading: () => null,
    error: (err, st) => null,
  );

  final stagingModel = stagingModelAsync.when(
    data: (model) => model,
    loading: () => null,
    error: (err, st) => null,
  );

  if (prodModel == null) return null;

  return MLInferenceStats(
    totalInferences: prodModel.totalInferences ?? 0,
    averageLatencyMs: prodModel.averageLatencyMs ?? 0.0,
    accuracyScore: prodModel.accuracyScore,
    stagingAccuracyScore: stagingModel?.accuracyScore,
  );
});

/// ユーザーの ML モデル使用統計情報。
/// ダッシュボード表示用。
class MLModelUsageStats {
  final int modelCount;
  final int productionModelCount;
  final int stagingModelCount;
  final double? averageAccuracyScore;
  final double? maxLatencyMs;

  MLModelUsageStats({
    required this.modelCount,
    required this.productionModelCount,
    required this.stagingModelCount,
    this.averageAccuracyScore,
    this.maxLatencyMs,
  });
}

/// ML モデル群の集計統計。
final mlModelUsageStatsProvider =
    FutureProvider.family<MLModelUsageStats?, String>((
  ref,
  userId,
) async {
  final modelsAsync = ref.watch(mlModelsProvider(userId));

  final models = modelsAsync.when(
    data: (models) => models,
    loading: () => <MLModel>[],
    error: (err, st) => <MLModel>[],
  );

  if (models.isEmpty) {
    return MLModelUsageStats(
      modelCount: 0,
      productionModelCount: 0,
      stagingModelCount: 0,
    );
  }

  final prodModels =
      models.where((m) => m.status == MLModelStatus.production).toList();
  final stagingModels =
      models.where((m) => m.status == MLModelStatus.staging).toList();

  // 平均精度スコア
  final accuracyScores = models
      .where((m) => m.accuracyScore != null)
      .map((m) => m.accuracyScore!)
      .toList();
  final avgAccuracy = accuracyScores.isEmpty
      ? null
      : accuracyScores.reduce((a, b) => a + b) / accuracyScores.length;

  // 最大レイテンシ
  final latencies = models
      .where((m) => m.averageLatencyMs != null)
      .map((m) => m.averageLatencyMs!)
      .toList();
  final maxLatency =
      latencies.isEmpty ? null : latencies.reduce((a, b) => a > b ? a : b);

  return MLModelUsageStats(
    modelCount: models.length,
    productionModelCount: prodModels.length,
    stagingModelCount: stagingModels.length,
    averageAccuracyScore: avgAccuracy,
    maxLatencyMs: maxLatency,
  );
});

/// A/B テスト評価情報。
/// ステージングモデルが本番より優秀か判定。
class ABTestEvaluation {
  final String productionModelVersion;
  final String? stagingModelVersion;
  final double productionAccuracy;
  final double? stagingAccuracy;
  final int productionTotalInferences;
  final int? stagingTotalInferences;
  final double
      accuracyImprovement; // パーセント（正の値=ステージング優秀）
  final bool isSignificant; // 統計的有意性（サンプルサイズ 30 以上 + 5% 以上の改善）

  ABTestEvaluation({
    required this.productionModelVersion,
    this.stagingModelVersion,
    required this.productionAccuracy,
    this.stagingAccuracy,
    required this.productionTotalInferences,
    this.stagingTotalInferences,
    required this.accuracyImprovement,
    required this.isSignificant,
  });

  /// 推奨: ステージングモデルを本番環境に昇格させるべきか
  bool get shouldPromoteStaging => isSignificant && accuracyImprovement > 0;
}

/// A/B テスト評価。
/// 本番モデル vs ステージングモデルの精度比較。
/// 統計的有意性を判定して本番昇格の推奨判断を提供。
final abTestEvaluationProvider =
    FutureProvider.family<ABTestEvaluation?, String>((
  ref,
  userId,
) async {
  final prodModelAsync =
      ref.watch(productionCategorizationModelProvider(userId));
  final stagingModelAsync =
      ref.watch(stagingCategorizationModelProvider(userId));

  final prodModel = prodModelAsync.when(
    data: (model) => model,
    loading: () => null,
    error: (err, st) => null,
  );

  final stagingModel = stagingModelAsync.when(
    data: (model) => model,
    loading: () => null,
    error: (err, st) => null,
  );

  if (prodModel == null) return null;

  final prodAccuracy = prodModel.accuracyScore ?? 0.0;
  final stagingAccuracy = stagingModel?.accuracyScore;
  final prodInferences = prodModel.totalInferences ?? 0;
  final stagingInferences = stagingModel?.totalInferences;

  // 統計的有意性判定
  // - サンプルサイズ >= 30
  // - 精度改善 >= 5%
  final minSampleSize = 30;
  final minImprovementPercent = 5.0;

  double improvement = 0.0;
  bool isSignificant = false;

  if (stagingAccuracy != null &&
      prodInferences >= minSampleSize &&
      stagingInferences != null &&
      stagingInferences >= minSampleSize) {
    improvement = (stagingAccuracy - prodAccuracy) * 100;
    isSignificant = improvement >= minImprovementPercent;
  }

  return ABTestEvaluation(
    productionModelVersion: prodModel.version,
    stagingModelVersion: stagingModel?.version,
    productionAccuracy: prodAccuracy,
    stagingAccuracy: stagingAccuracy,
    productionTotalInferences: prodInferences,
    stagingTotalInferences: stagingInferences,
    accuracyImprovement: improvement,
    isSignificant: isSignificant,
  );
});
