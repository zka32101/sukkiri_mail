import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/ml_model.dart';
import '../repositories/ml_model_repository.dart';
import 'auth_provider.dart';

/// ML Model Repository プロバイダ
final mlModelRepositoryProvider = Provider((ref) {
  return MLModelRepository();
});

/// 本番環境の分類モデルを取得
final productionCategorizationModelProvider = FutureProvider.autoDispose((ref) async {
  final userId = await ref.watch(currentUserIdProvider.future);
  final repo = ref.watch(mlModelRepositoryProvider);
  return await repo.getProductionModel(userId, MLModelType.categorization);
});
