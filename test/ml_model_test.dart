import 'package:flutter_test/flutter_test.dart';
import 'package:sukkiri_mail/models/ml_model.dart';

void main() {
  group('MLModelStatus', () {
    test('should have all status values', () {
      expect(MLModelStatus.values.length, equals(5));
      expect(MLModelStatus.values, contains(MLModelStatus.training));
      expect(MLModelStatus.values, contains(MLModelStatus.staging));
      expect(MLModelStatus.values, contains(MLModelStatus.production));
      expect(MLModelStatus.values, contains(MLModelStatus.deprecated));
      expect(MLModelStatus.values, contains(MLModelStatus.archived));
    });
  });

  group('MLModelType', () {
    test('should have all model type values', () {
      expect(MLModelType.values.length, equals(3));
      expect(MLModelType.values, contains(MLModelType.categorization));
      expect(MLModelType.values, contains(MLModelType.spamDetection));
      expect(MLModelType.values, contains(MLModelType.priorityPrediction));
    });
  });

  group('MLModel', () {
    test('should create instance with all required fields', () {
      final model = MLModel(
        id: 'model-1',
        name: 'Test Model',
        type: MLModelType.categorization,
        version: '1.0.0',
        status: MLModelStatus.training,
        createdAt: DateTime(2026, 9, 12),
      );

      expect(model.id, equals('model-1'));
      expect(model.name, equals('Test Model'));
      expect(model.type, equals(MLModelType.categorization));
      expect(model.version, equals('1.0.0'));
      expect(model.status, equals(MLModelStatus.training));
      expect(model.confidenceThreshold, equals(0.7));
    });

    test('should convert to and from map', () {
      final now = DateTime.now();
      final model = MLModel(
        id: 'model-1',
        name: 'Test Model',
        type: MLModelType.categorization,
        version: '1.0.0',
        status: MLModelStatus.production,
        createdAt: now,
        deployedAt: now,
        confidenceThreshold: 0.8,
        totalInferences: 100,
        averageLatencyMs: 45.5,
        accuracyScore: 0.92,
      );

      final map = model.toMap();
      expect(map['name'], equals('Test Model'));
      expect(map['type'], equals('categorization'));
      expect(map['version'], equals('1.0.0'));
      expect(map['status'], equals('production'));
      expect(map['confidenceThreshold'], equals(0.8));

      final restored = MLModel.fromMap('model-1', map);
      expect(restored.name, equals(model.name));
      expect(restored.type, equals(model.type));
      expect(restored.version, equals(model.version));
      expect(restored.status, equals(model.status));
      expect(restored.confidenceThreshold, equals(0.8));
    });

    test('copyWith should create new instance with updated fields', () {
      final original = MLModel(
        id: 'model-1',
        name: 'Test Model',
        type: MLModelType.categorization,
        version: '1.0.0',
        status: MLModelStatus.training,
        createdAt: DateTime(2026, 9, 12),
      );

      final updated = original.copyWith(
        name: 'Updated Model',
        status: MLModelStatus.production,
      );

      expect(updated.id, equals(original.id));
      expect(updated.name, equals('Updated Model'));
      expect(updated.status, equals(MLModelStatus.production));
      expect(updated.type, equals(original.type));
    });
  });

  group('MLInferenceResult', () {
    test('isSuccess should return true only when recommendation exists and no error', () {
      final successResult = MLInferenceResult(
        recommendedCategory: 'promotion',
        confidenceScore: 0.85,
        latencyMs: 50,
        modelVersion: '1.0.0',
      );

      expect(successResult.isSuccess, isTrue);

      final failureResult = MLInferenceResult(
        recommendedCategory: null,
        confidenceScore: 0.5,
        latencyMs: 50,
        modelVersion: '1.0.0',
        errorMessage: 'Inference failed',
      );

      expect(failureResult.isSuccess, isFalse);
    });

    test('isConfident should check against threshold', () {
      final result = MLInferenceResult(
        recommendedCategory: 'promotion',
        confidenceScore: 0.75,
        latencyMs: 50,
        modelVersion: '1.0.0',
      );

      expect(result.isConfident(0.7), isTrue);
      expect(result.isConfident(0.8), isFalse);
    });

    test('should convert to map', () {
      final result = MLInferenceResult(
        recommendedCategory: 'promotion',
        confidenceScore: 0.82,
        alternativesWithScores: {'notification': 0.12, 'invoice': 0.06},
        latencyMs: 45,
        modelVersion: '2.1.0',
      );

      final map = result.toMap();
      expect(map['recommendedCategory'], equals('promotion'));
      expect(map['confidenceScore'], equals(0.82));
      expect(map['latencyMs'], equals(45));
      expect(map['modelVersion'], equals('2.1.0'));
    });
  });
}
