import { logger } from 'firebase-functions/v2';
import { db } from '../firestore';
import { mlDataCollectionService } from './mlDataCollectionService';

/**
 * ML 推論エンジン（Vertex AI 統合）
 *
 * 責務:
 * - ML モデルの管理と版バージョン管理
 * - Vertex AI 推論の呼び出し
 * - フォールバック処理（ルールベース分類への切り替え）
 * - 推論結果の検証と統計更新
 * - キャッシング と レート制限
 */

export interface MLInferenceResult {
  recommendedCategory: string | null;
  confidenceScore: number; // 0.0-1.0
  alternativesWithScores: Record<string, number>;
  latencyMs: number;
  modelVersion: string;
  errorMessage?: string;
}

export interface MLModelMetadata {
  id: string;
  name: string;
  type: 'categorization' | 'spamDetection' | 'priorityPrediction';
  version: string; // semantic versioning
  status: 'training' | 'staging' | 'production' | 'deprecated' | 'archived';
  confidenceThreshold: number; // 0.0-1.0
  vertexAIModelId?: string; // "projects/{}/locations/{}/models/{}"
  totalInferences?: number;
  averageLatencyMs?: number;
  accuracyScore?: number;
}

interface MailFeatures {
  subject: string;
  from: string;
  snippet: string;
  recipientCount: number;
  hasAttachments: boolean;
}

export class MLInferenceService {
  private modelCache: Map<string, MLModelMetadata> = new Map();
  private inferenceCallCount: Map<string, number> = new Map(); // rate limiting

  /**
   * ルールベース分類（フォールバック用）
   * 既存のカテゴリ分類ロジックを使用
   */
  private async categorizeWithRules(features: MailFeatures): Promise<string> {
    // 既存の categorize.ts ロジックを統合
    // TODO: ルールベース分類に delegation
    return 'other';
  }

  /**
   * 本番環境の ML モデルで推論
   */
  async inferCategorization(
    userId: string,
    accountId: string,
    features: MailFeatures,
    forceRule: boolean = false
  ): Promise<MLInferenceResult> {
    const startTime = Date.now();

    try {
      // フォールバック: ルールベース分類に強制する場合
      if (forceRule) {
        const category = await this.categorizeWithRules(features);
        return {
          recommendedCategory: category,
          confidenceScore: 0.5,
          alternativesWithScores: {},
          latencyMs: Date.now() - startTime,
          modelVersion: 'rules-v1',
        };
      }

      // 本番モデルを取得
      const model = await this.getProductionModel(userId, 'categorization');
      if (!model) {
        logger.warn(`No production model found for user ${userId}, using rules`);
        return {
          recommendedCategory: await this.categorizeWithRules(features),
          confidenceScore: 0.5,
          alternativesWithScores: {},
          latencyMs: Date.now() - startTime,
          modelVersion: 'rules-v1',
          errorMessage: 'No ML model available',
        };
      }

      // レート制限チェック
      if (!this.checkRateLimit(userId, model)) {
        logger.info(`Rate limit exceeded for user ${userId}`);
        return {
          recommendedCategory: null,
          confidenceScore: 0,
          alternativesWithScores: {},
          latencyMs: Date.now() - startTime,
          modelVersion: model.version,
          errorMessage: 'Rate limit exceeded, using rules fallback',
        };
      }

      // Vertex AI に推論リクエスト
      const result = await this.vertexAIPredict(
        model.vertexAIModelId!,
        this.featuresToVertexInput(features)
      );

      // 信頼度が閾値以上か確認
      if (result.confidenceScore < model.confidenceThreshold) {
        logger.info(
          `Low confidence ${result.confidenceScore} < ${model.confidenceThreshold}, using rules`
        );
        const category = await this.categorizeWithRules(features);
        result.recommendedCategory = category;
      }

      // 推論統計を更新
      await this.updateInferenceStats(userId, model.id, {
        latencyMs: result.latencyMs,
        accuracyScore: undefined, // 後で検証時に更新
      });

      return result;
    } catch (error) {
      logger.error(`ML inference failed for user ${userId}: ${error}`);
      return {
        recommendedCategory: null,
        confidenceScore: 0,
        alternativesWithScores: {},
        latencyMs: Date.now() - startTime,
        modelVersion: 'unknown',
        errorMessage: `Inference error: ${error}`,
      };
    }
  }

  /**
   * 本番環境のモデルをメモリキャッシュから取得
   */
  private async getProductionModel(
    userId: string,
    modelType: string
  ): Promise<MLModelMetadata | null> {
    const cacheKey = `${userId}:${modelType}:prod`;
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey) || null;
    }

    try {
      const snapshot = await db()
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .where('type', '==', modelType)
        .where('status', '==', 'production')
        .orderBy('deployedAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const model: MLModelMetadata = {
        id: doc.id,
        ...(doc.data() as Omit<MLModelMetadata, 'id'>),
      };

      // 1時間キャッシュ
      this.modelCache.set(cacheKey, model);
      setTimeout(() => this.modelCache.delete(cacheKey), 3600000);

      return model;
    } catch (error) {
      logger.error(`Failed to fetch production model: ${error}`);
      return null;
    }
  }

  /**
   * レート制限チェック（1時間制限）
   */
  private checkRateLimit(userId: string, model: MLModelMetadata): boolean {
    if (!model.totalInferences || !model.averageLatencyMs) {
      return true; // 初回は制限なし
    }

    // 1時間のレート制限（デフォルト: 10,000リクエスト/時間）
    const limit = model.totalInferences > 1000 ? 1000 : 10000; // 調整可能

    const key = `${userId}:rateLimit:${Date.now() / 3600000 | 0}`;
    const current = this.inferenceCallCount.get(key) || 0;

    if (current >= limit) {
      return false;
    }

    this.inferenceCallCount.set(key, current + 1);
    return true;
  }

  /**
   * MailFeatures を Vertex AI 入力形式に変換
   */
  private featuresToVertexInput(features: MailFeatures): Record<string, unknown> {
    return {
      subject: features.subject,
      from: features.from,
      snippet: features.snippet,
      recipient_count: features.recipientCount,
      has_attachments: features.hasAttachments,
    };
  }

  /**
   * Vertex AI に推論リクエスト
   * TODO: google-cloud-aiplatform ライブラリと統合
   */
  private async vertexAIPredict(
    modelId: string,
    features: Record<string, unknown>
  ): Promise<MLInferenceResult> {
    const startTime = Date.now();

    // ここで実装: Vertex AI Python API または gRPC を呼び出し
    // サンプル実装は以下の通り（実際は SDK に置き換え）

    try {
      // TODO: Vertex AI API 呼び出し
      // const response = await vertexAiClient.predict(modelId, [features]);

      // サンプルレスポンス
      return {
        recommendedCategory: 'promotion',
        confidenceScore: 0.82,
        alternativesWithScores: {
          'notification': 0.12,
          'invoice': 0.04,
          'other': 0.02,
        },
        latencyMs: Date.now() - startTime,
        modelVersion: '2.1.0',
      };
    } catch (error) {
      logger.error(`Vertex AI prediction failed: ${error}`);
      throw error;
    }
  }

  /**
   * 推論統計を Firestore に更新
   */
  private async updateInferenceStats(
    userId: string,
    modelId: string,
    stats: { latencyMs: number; accuracyScore?: number }
  ): Promise<void> {
    try {
      const doc = await db()
        .collection('users')
        .doc(userId)
        .collection('mlModels')
        .doc(modelId)
        .get();

      if (!doc.exists) return;

      const data = doc.data() as MLModelMetadata;
      const currentTotal = data.totalInferences || 0;
      const currentAvgLatency = data.averageLatencyMs || 0;

      // 新しい平均レイテンシを計算
      const newAvgLatency =
        (currentAvgLatency * currentTotal + stats.latencyMs) / (currentTotal + 1);

      await doc.ref.update({
        totalInferences: currentTotal + 1,
        averageLatencyMs: newAvgLatency,
        ...(stats.accuracyScore !== undefined && {
          accuracyScore: stats.accuracyScore,
        }),
      });
    } catch (error) {
      logger.warn(`Failed to update inference stats: ${error}`);
    }
  }

  /**
   * 推論結果をログに記録し、モデル統計を更新。
   * A/B テストデータ収集用。
   */
  async logAndTrackInference(
    userId: string,
    accountId: string,
    messageId: string,
    modelType: 'categorization' | 'spamDetection' | 'priorityPrediction',
    inferenceResult: MLInferenceResult
  ): Promise<string> {
    try {
      // 推論ログを Firestore に記録
      const logId = await mlDataCollectionService.logInference(
        userId,
        accountId,
        messageId,
        inferenceResult.modelVersion,
        modelType,
        inferenceResult
      );

      return logId;
    } catch (error) {
      logger.error(`Failed to log and track inference: ${error}`);
      throw error;
    }
  }

  /**
   * 推論検証結果をログに反映。
   * ユーザーが実際に分類したカテゴリを記録して精度計算に使用。
   */
  async verifyInferenceAccuracy(
    userId: string,
    logId: string,
    userCategory: string,
    userFeedback: 'accept' | 'reject' | 'skip'
  ): Promise<void> {
    try {
      await mlDataCollectionService.verifyInference(
        userId,
        logId,
        userCategory,
        userFeedback
      );
    } catch (error) {
      logger.error(`Failed to verify inference accuracy: ${error}`);
      throw error;
    }
  }

  /**
   * モデルキャッシュをクリア（テスト用・管理用）
   */
  clearCache(): void {
    this.modelCache.clear();
    this.inferenceCallCount.clear();
  }
}

export const mlInferenceService = new MLInferenceService();
