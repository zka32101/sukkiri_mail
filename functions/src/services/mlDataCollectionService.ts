import { logger } from 'firebase-functions/v2';
import { db } from '../firestore';
import { MLInferenceResult } from './mlInferenceService';

/**
 * ML 推論ログエントリ。
 * モデルの精度評価・改善用データセット。
 */
export interface MLInferenceLogEntry {
  // 推論リクエスト情報
  messageId: string;
  accountId: string;
  userId: string;

  // 推論結果
  modelVersion: string;
  modelType: 'categorization' | 'spamDetection' | 'priorityPrediction';
  recommendedCategory: string | null;
  confidenceScore: number;
  alternativesWithScores: Record<string, number>;
  latencyMs: number;

  // ユーザー検証結果（後で更新）
  userCategory?: string; // ユーザーが実際に分類したカテゴリ
  isCorrect?: boolean; // recommendedCategory === userCategory
  userFeedback?: 'accept' | 'reject' | 'skip'; // ユーザーのアクション

  // タイムスタンプ
  inferredAt: string; // ISO8601
  verifiedAt?: string; // ユーザーがアクション取ったとき
  daysToVerification?: number; // 推論から検証までの日数

  // メタデータ
  featureHash?: string; // 再現性・デバッグ用
}

/**
 * ML 推論データ収集・評価サービス。
 * モデル精度向上のためのデータセット管理。
 */
export class MLDataCollectionService {
  /**
   * 推論結果をログに記録。
   * Firestore: /users/{userId}/mlInferenceLogs/{logId}
   */
  async logInference(
    userId: string,
    accountId: string,
    messageId: string,
    modelVersion: string,
    modelType: 'categorization' | 'spamDetection' | 'priorityPrediction',
    inferenceResult: MLInferenceResult
  ): Promise<string> {
    try {
      const entry: MLInferenceLogEntry = {
        messageId,
        accountId,
        userId,
        modelVersion,
        modelType,
        recommendedCategory: inferenceResult.recommendedCategory,
        confidenceScore: inferenceResult.confidenceScore,
        alternativesWithScores: inferenceResult.alternativesWithScores,
        latencyMs: inferenceResult.latencyMs,
        inferredAt: new Date().toISOString(),
      };

      const docRef = await db()
        .collection('users')
        .doc(userId)
        .collection('mlInferenceLogs')
        .add(entry);

      logger.info(
        `ML inference logged: user=${userId}, message=${messageId}, model=${modelVersion}`
      );
      return docRef.id;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to log ML inference: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * ユーザーの検証結果でログを更新。
   * ユーザーが実際に分類したカテゴリをログに記録し、精度を計算。
   */
  async verifyInference(
    userId: string,
    logId: string,
    userCategory: string,
    userFeedback: 'accept' | 'reject' | 'skip'
  ): Promise<void> {
    try {
      const logRef = db()
        .collection('users')
        .doc(userId)
        .collection('mlInferenceLogs')
        .doc(logId);

      const doc = await logRef.get();
      if (!doc.exists) {
        logger.warn(`ML inference log not found: ${logId}`);
        return;
      }

      const entry = doc.data() as MLInferenceLogEntry;
      const isCorrect = entry.recommendedCategory === userCategory;
      const daysToVerification = entry.inferredAt
        ? Math.floor(
            (Date.now() - new Date(entry.inferredAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      await logRef.update({
        userCategory,
        isCorrect,
        userFeedback,
        verifiedAt: new Date().toISOString(),
        daysToVerification,
      });

      logger.info(
        `ML inference verified: user=${userId}, log=${logId}, correct=${isCorrect}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to verify ML inference: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * 指定期間のモデル精度統計を計算。
   * A/B テスト検証用。
   */
  async calculateModelAccuracy(
    userId: string,
    modelVersion: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalInferences: number;
    correctInferences: number;
    accuracy: number; // 0.0-1.0
    correctByConfidence: Record<string, number>; // 信頼度レンジごと
  }> {
    try {
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      const snapshot = await db()
        .collection('users')
        .doc(userId)
        .collection('mlInferenceLogs')
        .where('modelVersion', '==', modelVersion)
        .where('inferredAt', '>=', startISO)
        .where('inferredAt', '<=', endISO)
        .where('isCorrect', '!=', null)
        .get();

      if (snapshot.empty) {
        return {
          totalInferences: 0,
          correctInferences: 0,
          accuracy: 0,
          correctByConfidence: {},
        };
      }

      const entries = snapshot.docs.map((doc) => doc.data() as MLInferenceLogEntry);

      const correctCount = entries.filter((e) => e.isCorrect).length;
      const accuracy = correctCount / entries.length;

      // 信頼度レンジ（0.0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0）ごとの精度
      const correctByConfidence: Record<string, number> = {
        '0.0-0.2': 0,
        '0.2-0.4': 0,
        '0.4-0.6': 0,
        '0.6-0.8': 0,
        '0.8-1.0': 0,
      };
      const countByConfidence: Record<string, number> = {
        '0.0-0.2': 0,
        '0.2-0.4': 0,
        '0.4-0.6': 0,
        '0.6-0.8': 0,
        '0.8-1.0': 0,
      };

      entries.forEach((entry) => {
        const score = entry.confidenceScore;
        let range = '';
        if (score < 0.2) range = '0.0-0.2';
        else if (score < 0.4) range = '0.2-0.4';
        else if (score < 0.6) range = '0.4-0.6';
        else if (score < 0.8) range = '0.6-0.8';
        else range = '0.8-1.0';

        countByConfidence[range]++;
        if (entry.isCorrect) {
          correctByConfidence[range]++;
        }
      });

      // 精度を計算（ゼロ除算回避）
      Object.keys(correctByConfidence).forEach((range) => {
        if (countByConfidence[range] > 0) {
          correctByConfidence[range] =
            correctByConfidence[range] / countByConfidence[range];
        }
      });

      return {
        totalInferences: entries.length,
        correctInferences: correctCount,
        accuracy,
        correctByConfidence,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to calculate model accuracy: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * 期限切れのログを削除（90日以上前）。
   * ストレージ最適化用。
   */
  async cleanupOldLogs(userId: string, retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const snapshot = await db()
        .collection('users')
        .doc(userId)
        .collection('mlInferenceLogs')
        .where('inferredAt', '<', cutoffDate.toISOString())
        .get();

      let deletedCount = 0;
      for (const doc of snapshot.docs) {
        await doc.ref.delete();
        deletedCount++;
      }

      logger.info(
        `Cleaned up ${deletedCount} old ML inference logs for user ${userId}`
      );
      return deletedCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to cleanup ML logs: ${errorMsg}`);
      throw error;
    }
  }
}

export const mlDataCollectionService = new MLDataCollectionService();
