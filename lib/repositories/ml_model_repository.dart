import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/ml_model.dart';

/// ML モデルメタデータの Firestore リポジトリ。
///
/// Firestore パス:
/// - /users/{userId}/mlModels/{modelId}
///
/// インデックス:
/// - type (ASC), status (ASC), createdAt (DESC)
class MLModelRepository {
  final FirebaseFirestore _firestore;

  MLModelRepository({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  /// ユーザーのすべての ML モデルを取得（最新順）
  Stream<List<MLModel>> watchModelsForUser(String userId) {
    return _firestore
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs
              .map((doc) => MLModel.fromMap(doc.id, doc.data()))
              .toList();
        });
  }

  /// 特定のステータスのモデルを取得
  Stream<List<MLModel>> watchModelsByStatus(String userId, MLModelStatus status) {
    final statusStr = status.toString().split('.').last;
    return _firestore
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .where('status', isEqualTo: statusStr)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs
              .map((doc) => MLModel.fromMap(doc.id, doc.data()))
              .toList();
        });
  }

  /// 本番環境のモデルを取得（推論用）
  Future<MLModel?> getProductionModel(String userId, MLModelType type) async {
    final typeStr = type.toString().split('.').last;
    final snapshot = await _firestore
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .where('type', isEqualTo: typeStr)
        .where('status', isEqualTo: 'production')
        .orderBy('deployedAt', descending: true)
        .limit(1)
        .get();

    if (snapshot.docs.isEmpty) return null;
    return MLModel.fromMap(snapshot.docs.first.id, snapshot.docs.first.data());
  }

  /// モデルを新規作成
  Future<String> addModel(String userId, MLModel model) async {
    final docRef = await _firestore
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .add(model.toMap());
    return docRef.id;
  }

  /// モデルを更新
  Future<void> updateModel(String userId, MLModel model) async {
    await _firestore
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .doc(model.id)
        .update(model.toMap());
  }

  /// モデルのステータスを更新
  Future<void> updateStatus(String userId, String modelId, MLModelStatus newStatus) async {
    await _firestore
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .doc(modelId)
        .update({
          'status': newStatus.toString().split('.').last,
          'deployedAt': newStatus == MLModelStatus.production ? DateTime.now().toIso8601String() : null,
        });
  }

  /// 推論統計を更新（使用数・レイテンシ・精度）
  Future<void> updateInferenceStats(
    String userId,
    String modelId, {
    required int latencyMs,
    required double? accuracyScore,
  }) async {
    final doc = await _firestore
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .doc(modelId)
        .get();

    if (!doc.exists) return;

    final currentTotal = (doc['totalInferences'] as int?) ?? 0;
    final currentAvgLatency = (doc['averageLatencyMs'] as double?) ?? 0.0;

    // 新しい平均レイテンシを計算
    final newAvgLatency = (currentAvgLatency * currentTotal + latencyMs) / (currentTotal + 1);

    // ignore: use_null_aware_elements
    await doc.reference.update({
      'totalInferences': currentTotal + 1,
      'averageLatencyMs': newAvgLatency,
      if (accuracyScore != null) 'accuracyScore': accuracyScore,
    });
  }

  /// モデルを削除
  Future<void> deleteModel(String userId, String modelId) async {
    await _firestore
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .doc(modelId)
        .delete();
  }

  /// すべてのモデルを削除（ユーザー削除時など）
  Future<void> deleteAllModelsForUser(String userId) async {
    final docs = await _firestore
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .get();

    for (final doc in docs.docs) {
      await doc.reference.delete();
    }
  }
}
