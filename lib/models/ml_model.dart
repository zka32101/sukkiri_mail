/// ML モデルのメタデータと状態管理。
/// Vertex AI 統合に向けた共通インターフェース。

enum MLModelStatus {
  training, // トレーニング中
  staging, // ステージング検証中
  production, // 本番環境
  deprecated, // 廃止予定
  archived, // アーカイブ
}

enum MLModelType {
  categorization, // メール分類
  spamDetection, // スパム検出
  priorityPrediction, // 優先度予測（拡張用）
}

/// ML モデルのメタデータ定義。
class MLModel {
  final String id;
  final String name;
  final MLModelType type;
  final String version; // semantic versioning: "1.0.0"
  final MLModelStatus status;
  final DateTime createdAt;
  final DateTime? deployedAt;
  final String? description;

  /// モデルの信頼度スコア（推論結果の最小閾値）
  /// 0.0-1.0: 結果の信頼度がこれ以上の場合のみ使用
  final double confidenceThreshold;

  /// 推論時のレート制限（1時間あたりのクエリ数）
  final int? rateLimitPerHour;

  /// Vertex AI モデルリソース ID
  /// "projects/{project-id}/locations/{region}/models/{model-id}"
  final String? vertexAIModelId;

  /// 統計情報
  final int? totalInferences;
  final double? averageLatencyMs;
  final double? accuracyScore; // テスト精度（0.0-1.0）

  MLModel({
    required this.id,
    required this.name,
    required this.type,
    required this.version,
    required this.status,
    required this.createdAt,
    this.deployedAt,
    this.description,
    this.confidenceThreshold = 0.7,
    this.rateLimitPerHour,
    this.vertexAIModelId,
    this.totalInferences,
    this.averageLatencyMs,
    this.accuracyScore,
  });

  /// Firestore から復元
  static MLModel fromMap(String id, Map<String, dynamic> data) {
    return MLModel(
      id: id,
      name: data['name'] as String,
      type: MLModelType.values.firstWhere(
        (e) => e.toString().split('.').last == data['type'],
        orElse: () => MLModelType.categorization,
      ),
      version: data['version'] as String,
      status: MLModelStatus.values.firstWhere(
        (e) => e.toString().split('.').last == data['status'],
        orElse: () => MLModelStatus.training,
      ),
      createdAt: DateTime.parse(data['createdAt'] as String),
      deployedAt: data['deployedAt'] != null
          ? DateTime.parse(data['deployedAt'] as String)
          : null,
      description: data['description'] as String?,
      confidenceThreshold:
          (data['confidenceThreshold'] as num?)?.toDouble() ?? 0.7,
      rateLimitPerHour: data['rateLimitPerHour'] as int?,
      vertexAIModelId: data['vertexAIModelId'] as String?,
      totalInferences: data['totalInferences'] as int?,
      averageLatencyMs: (data['averageLatencyMs'] as num?)?.toDouble(),
      accuracyScore: (data['accuracyScore'] as num?)?.toDouble(),
    );
  }

  /// Firestore へ保存
  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'type': type.toString().split('.').last,
      'version': version,
      'status': status.toString().split('.').last,
      'createdAt': createdAt.toIso8601String(),
      'deployedAt': deployedAt?.toIso8601String(),
      'description': description,
      'confidenceThreshold': confidenceThreshold,
      'rateLimitPerHour': rateLimitPerHour,
      'vertexAIModelId': vertexAIModelId,
      'totalInferences': totalInferences,
      'averageLatencyMs': averageLatencyMs,
      'accuracyScore': accuracyScore,
    };
  }

  /// モデルのコピー（更新用）
  MLModel copyWith({
    String? name,
    MLModelType? type,
    String? version,
    MLModelStatus? status,
    DateTime? deployedAt,
    String? description,
    double? confidenceThreshold,
    int? rateLimitPerHour,
    String? vertexAIModelId,
    int? totalInferences,
    double? averageLatencyMs,
    double? accuracyScore,
  }) {
    return MLModel(
      id: id,
      name: name ?? this.name,
      type: type ?? this.type,
      version: version ?? this.version,
      status: status ?? this.status,
      createdAt: createdAt,
      deployedAt: deployedAt ?? this.deployedAt,
      description: description ?? this.description,
      confidenceThreshold: confidenceThreshold ?? this.confidenceThreshold,
      rateLimitPerHour: rateLimitPerHour ?? this.rateLimitPerHour,
      vertexAIModelId: vertexAIModelId ?? this.vertexAIModelId,
      totalInferences: totalInferences ?? this.totalInferences,
      averageLatencyMs: averageLatencyMs ?? this.averageLatencyMs,
      accuracyScore: accuracyScore ?? this.accuracyScore,
    );
  }

  @override
  String toString() =>
      'MLModel(id=$id, name=$name, version=$version, status=$status)';
}

/// ML 推論リクエストの結果。
class MLInferenceResult {
  /// 推奨カテゴリ（null = ルールベース分類を使用）
  final String? recommendedCategory;

  /// 信頼度スコア（0.0-1.0）
  final double confidenceScore;

  /// その他の候補カテゴリと信頼度
  final Map<String, double> alternativesWithScores;

  /// 推論に要した時間（ミリ秒）
  final int latencyMs;

  /// 使用したモデルのバージョン
  final String modelVersion;

  /// エラーメッセージ（失敗時のみ）
  final String? errorMessage;

  MLInferenceResult({
    this.recommendedCategory,
    required this.confidenceScore,
    this.alternativesWithScores = const {},
    required this.latencyMs,
    required this.modelVersion,
    this.errorMessage,
  });

  /// 推論が成功したか
  bool get isSuccess => errorMessage == null && recommendedCategory != null;

  /// 信頼度が十分か（モデルの閾値以上か）
  bool isConfident(double threshold) => confidenceScore >= threshold;

  Map<String, dynamic> toMap() {
    return {
      'recommendedCategory': recommendedCategory,
      'confidenceScore': confidenceScore,
      'alternativesWithScores': alternativesWithScores,
      'latencyMs': latencyMs,
      'modelVersion': modelVersion,
      'errorMessage': errorMessage,
    };
  }
}
