/**
 * Error Handling Service
 *
 * エラー分類、リトライ戦略、サーキットブレーカーパターン
 * - エラー分類（一時的 vs 永続的）
 * - リトライロジック（指数バックオフ）
 * - サーキットブレーカー（カスケード障害の防止）
 * - エラー統計
 */

import { logger } from 'firebase-functions/v2';

export enum ErrorType {
  TEMPORARY = 'temporary', // リトライ可能
  PERMANENT = 'permanent', // リトライ不可
  RATE_LIMIT = 'rate_limit', // レート制限
  AUTHENTICATION = 'authentication', // 認証エラー
  NETWORK = 'network', // ネットワークエラー
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  type: ErrorType;
  message: string;
  statusCode?: number;
  isRetryable: boolean;
  lastError?: Error;
  attemptNumber: number;
  totalAttempts: number;
}

export interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
}

/**
 * エラーの分類とリトライ可能性を判定
 */
export class ErrorClassifier {
  /**
   * エラーが一時的か永続的かを分類
   */
  static classifyError(error: unknown): ErrorContext {
    let type = ErrorType.UNKNOWN;
    let statusCode: number | undefined;
    let message = 'Unknown error';
    let isRetryable = false;

    if (error instanceof Error) {
      message = error.message;

      // HTTP ステータスコードの場合
      const statusMatch = error.message.match(/status[\s:]+(\d{3})/i);
      if (statusMatch) {
        statusCode = parseInt(statusMatch[1], 10);
        ({ type, isRetryable } = this.classifyByStatusCode(statusCode));
      }
      // レート制限エラー
      else if (
        error.message.includes('rate limit') ||
        error.message.includes('quota')
      ) {
        type = ErrorType.RATE_LIMIT;
        isRetryable = true;
      }
      // ネットワークエラー
      else if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('network') ||
        error.message.includes('timeout')
      ) {
        type = ErrorType.NETWORK;
        isRetryable = true;
      }
      // 認証エラー
      else if (
        error.message.includes('unauthorized') ||
        error.message.includes('forbidden')
      ) {
        type = ErrorType.AUTHENTICATION;
        isRetryable = false;
      }
    }

    return {
      type,
      message,
      statusCode,
      isRetryable,
      lastError: error instanceof Error ? error : undefined,
      attemptNumber: 1,
      totalAttempts: 1,
    };
  }

  /**
   * HTTP ステータスコードでエラーを分類
   */
  private static classifyByStatusCode(statusCode: number): {
    type: ErrorType;
    isRetryable: boolean;
  } {
    if (statusCode >= 500) {
      // サーバーエラー（一時的の可能性が高い）
      return { type: ErrorType.TEMPORARY, isRetryable: true };
    }
    if (statusCode === 429) {
      // レート制限
      return { type: ErrorType.RATE_LIMIT, isRetryable: true };
    }
    if (statusCode === 408 || statusCode === 504) {
      // タイムアウト
      return { type: ErrorType.TEMPORARY, isRetryable: true };
    }
    if (statusCode === 401 || statusCode === 403) {
      // 認証/認可エラー
      return { type: ErrorType.AUTHENTICATION, isRetryable: false };
    }
    if (statusCode >= 400 && statusCode < 500) {
      // クライアントエラー（リトライ不可）
      return { type: ErrorType.PERMANENT, isRetryable: false };
    }

    return { type: ErrorType.UNKNOWN, isRetryable: false };
  }
}

/**
 * リトライロジック（指数バックオフ）
 */
export class RetryStrategy {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly jitterFactor: number;

  constructor(
    maxAttempts: number = 3,
    baseDelayMs: number = 100,
    maxDelayMs: number = 10000,
    jitterFactor: number = 0.1
  ) {
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.jitterFactor = jitterFactor;
  }

  /**
   * リトライが可能か判定
   */
  shouldRetry(context: ErrorContext): boolean {
    if (!context.isRetryable) {
      return false;
    }
    if (context.attemptNumber >= this.maxAttempts) {
      return false;
    }
    return true;
  }

  /**
   * リトライまでの遅延時間（ミリ秒）を計算
   */
  getDelayMs(attemptNumber: number): number {
    // 指数バックオフ: base * (2 ^ attempt)
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attemptNumber - 1);
    const delayWithCap = Math.min(exponentialDelay, this.maxDelayMs);

    // ジッターを追加（0 ± jitterFactor * delay）
    const jitter = (Math.random() - 0.5) * 2 * this.jitterFactor * delayWithCap;
    const finalDelay = Math.max(0, delayWithCap + jitter);

    return Math.floor(finalDelay);
  }

  /**
   * リトライ実行（async版）
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const context = ErrorClassifier.classifyError(error);
        context.attemptNumber = attempt;
        context.totalAttempts = this.maxAttempts;

        if (!this.shouldRetry(context)) {
          logger.error(
            `${operationName} failed (attempt ${attempt}/${this.maxAttempts}): ${context.message} (not retryable)`
          );
          throw error;
        }

        if (attempt < this.maxAttempts) {
          const delayMs = this.getDelayMs(attempt);
          logger.warn(
            `${operationName} failed (attempt ${attempt}/${this.maxAttempts}): ${context.message}. Retrying in ${delayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    logger.error(
      `${operationName} failed after ${this.maxAttempts} attempts`
    );
    throw lastError;
  }
}

/**
 * サーキットブレーカーパターン
 * 障害が連続で発生する場合、リクエストを短時間遮断して負荷を軽減
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = {
    status: 'closed',
    failureCount: 0,
    successCount: 0,
  };

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeoutMs: number;

  constructor(
    failureThreshold: number = 5,
    successThreshold: number = 2,
    timeoutMs: number = 60000
  ) {
    this.failureThreshold = failureThreshold;
    this.successThreshold = successThreshold;
    this.timeoutMs = timeoutMs;
  }

  /**
   * サーキットブレーカーの状態を取得
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * リクエストが許可されているか確認
   */
  isOpen(): boolean {
    if (this.state.status === 'closed') {
      return false;
    }

    if (this.state.status === 'open') {
      // タイムアウト時間が経過したら half_open に移行
      if (
        this.state.lastFailureTime &&
        Date.now() - this.state.lastFailureTime.getTime() > this.timeoutMs
      ) {
        this.state.status = 'half_open';
        this.state.successCount = 0;
        return false; // 1リクエストは許可
      }
      return true; // ブロック
    }

    // half_open: リクエストを許可
    return false;
  }

  /**
   * リクエスト成功を記録
   */
  recordSuccess(): void {
    if (this.state.status === 'half_open') {
      this.state.successCount++;

      if (this.state.successCount >= this.successThreshold) {
        this.state.status = 'closed';
        this.state.failureCount = 0;
        this.state.successCount = 0;
        logger.info('Circuit breaker closed (recovered)');
      }
    } else if (this.state.status === 'closed') {
      this.state.failureCount = 0; // リセット
    }
  }

  /**
   * リクエスト失敗を記録
   */
  recordFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = new Date();

    if (this.state.failureCount >= this.failureThreshold) {
      if (this.state.status !== 'open') {
        this.state.status = 'open';
        this.state.nextRetryTime = new Date(
          Date.now() + this.timeoutMs
        );
        logger.warn(
          `Circuit breaker opened. Will retry after ${this.timeoutMs}ms`
        );
      }
    } else if (this.state.status === 'half_open') {
      this.state.status = 'open';
      this.state.successCount = 0;
      logger.warn('Circuit breaker reopened (failure during recovery)');
    }
  }

  /**
   * サーキットブレーカーをリセット
   */
  reset(): void {
    this.state = {
      status: 'closed',
      failureCount: 0,
      successCount: 0,
    };
  }
}

/**
 * グローバルエラーハンドリングサービス
 */
export class ErrorHandlingService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorStats: Map<string, { count: number; lastError: Date }> =
    new Map();

  /**
   * 名前付きサーキットブレーカーを取得
   */
  getCircuitBreaker(name: string): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker());
    }
    return this.circuitBreakers.get(name)!;
  }

  /**
   * エラーを記録
   */
  recordError(operation: string, error: unknown): void {
    const stats = this.errorStats.get(operation) || {
      count: 0,
      lastError: new Date(),
    };
    stats.count++;
    stats.lastError = new Date();
    this.errorStats.set(operation, stats);
  }

  /**
   * 操作のエラー統計を取得
   */
  getErrorStats(operation: string): { count: number; lastError: Date } | null {
    return this.errorStats.get(operation) || null;
  }

  /**
   * すべてのエラー統計を取得
   */
  getAllErrorStats(): Record<string, { count: number; lastError: Date }> {
    const stats: Record<string, { count: number; lastError: Date }> = {};
    this.errorStats.forEach((value, key) => {
      stats[key] = value;
    });
    return stats;
  }

  /**
   * エラー統計をリセット
   */
  resetErrorStats(operation?: string): void {
    if (operation) {
      this.errorStats.delete(operation);
    } else {
      this.errorStats.clear();
    }
  }
}

export const errorHandlingService = new ErrorHandlingService();
export const defaultRetryStrategy = new RetryStrategy();
