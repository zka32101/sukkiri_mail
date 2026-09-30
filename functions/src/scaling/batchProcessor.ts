/**
 * Batch Processor Service
 *
 * バッチ処理による効率的な操作
 * - 自動バッチ集約
 * - タイムアウト管理
 * - エラーハンドリング
 */

import { logger } from 'firebase-functions/v2';

export interface BatchConfig {
  batchSize: number; // バッチサイズ
  timeoutMs: number; // バッチタイムアウト
  maxRetries: number; // 最大リトライ数
}

export interface BatchResult<T> {
  successful: T[];
  failed: Array<{ item: T; error: Error }>;
  totalProcessed: number;
  totalTime: number;
}

/**
 * バッチプロセッサ
 */
export class BatchProcessor<T> {
  private queue: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly config: BatchConfig;
  private readonly processFn: (items: T[]) => Promise<T[]>;
  private processedCount: number = 0;
  private failedCount: number = 0;

  constructor(
    processFn: (items: T[]) => Promise<T[]>,
    config: Partial<BatchConfig> = {}
  ) {
    this.processFn = processFn;
    this.config = {
      batchSize: config.batchSize || 100,
      timeoutMs: config.timeoutMs || 5000,
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * アイテムをバッチキューに追加
   */
  async add(item: T): Promise<void> {
    this.queue.push(item);

    if (this.shouldFlush()) {
      await this.flush();
    } else if (!this.timer) {
      this.startTimer();
    }
  }

  /**
   * 複数アイテムをバッチキューに追加
   */
  async addBatch(items: T[]): Promise<void> {
    this.queue.push(...items);

    if (this.shouldFlush()) {
      await this.flush();
    } else if (!this.timer) {
      this.startTimer();
    }
  }

  /**
   * フラッシュが必要か判定
   */
  private shouldFlush(): boolean {
    return this.queue.length >= this.config.batchSize;
  }

  /**
   * タイマーを開始
   */
  private startTimer(): void {
    this.timer = setTimeout(() => {
      this.flush().catch((error) => {
        logger.error(`Batch processor flush failed: ${error}`);
      });
    }, this.config.timeoutMs);
  }

  /**
   * バッチを処理
   */
  async flush(): Promise<BatchResult<T>> {
    const startTime = Date.now();

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) {
      return {
        successful: [],
        failed: [],
        totalProcessed: 0,
        totalTime: 0,
      };
    }

    const batch = this.queue.splice(0, this.config.batchSize);
    const successful: T[] = [];
    const failed: Array<{ item: T; error: Error }> = [];

    try {
      const result = await this.processWithRetry(batch);
      successful.push(...result);
      this.processedCount += result.length;
    } catch (error) {
      // 全体的なエラーの場合、全アイテムを失敗として記録
      const err = error instanceof Error ? error : new Error(String(error));
      failed.push(
        ...batch.map((item) => ({
          item,
          error: err,
        }))
      );
      this.failedCount += batch.length;

      logger.error(
        `Batch processing failed: ${err.message}`,
        { failedCount: batch.length }
      );
    }

    // 残りのアイテムがある場合、タイマーを再開
    if (this.queue.length > 0) {
      this.startTimer();
    }

    return {
      successful,
      failed,
      totalProcessed: successful.length,
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * リトライロジック付きで処理
   */
  private async processWithRetry(items: T[]): Promise<T[]> {
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await this.processFn(items);
      } catch (error) {
        if (attempt === this.config.maxRetries - 1) {
          throw error;
        }

        // エクスポーネンシャルバックオフ
        const delay = Math.pow(2, attempt) * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return [];
  }

  /**
   * 待機中のアイテム数を取得
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * 処理済みアイテム数を取得
   */
  getProcessedCount(): number {
    return this.processedCount;
  }

  /**
   * 失敗したアイテム数を取得
   */
  getFailedCount(): number {
    return this.failedCount;
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    pending: number;
    processed: number;
    failed: number;
    successRate: number;
  } {
    const total = this.processedCount + this.failedCount;
    const successRate = total === 0 ? 0 : (this.processedCount / total) * 100;

    return {
      pending: this.queue.length,
      processed: this.processedCount,
      failed: this.failedCount,
      successRate,
    };
  }

  /**
   * リセット
   */
  reset(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.queue = [];
    this.processedCount = 0;
    this.failedCount = 0;
  }
}

/**
 * 並列バッチプロセッサ（複数バッチを並行処理）
 */
export class ParallelBatchProcessor<T> {
  private processors: Map<string, BatchProcessor<T>> = new Map();
  private readonly processFn: (items: T[]) => Promise<T[]>;
  private readonly config: BatchConfig;

  constructor(
    processFn: (items: T[]) => Promise<T[]>,
    config: Partial<BatchConfig> = {}
  ) {
    this.processFn = processFn;
    this.config = {
      batchSize: config.batchSize || 100,
      timeoutMs: config.timeoutMs || 5000,
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * キーの下でアイテムを追加（キー単位で別々のバッチ）
   */
  async add(key: string, item: T): Promise<void> {
    if (!this.processors.has(key)) {
      this.processors.set(
        key,
        new BatchProcessor(this.processFn, this.config)
      );
    }

    const processor = this.processors.get(key)!;
    await processor.add(item);
  }

  /**
   * すべてのバッチをフラッシュ
   */
  async flushAll(): Promise<BatchResult<T>[]> {
    const results: BatchResult<T>[] = [];

    for (const processor of this.processors.values()) {
      const result = await processor.flush();
      results.push(result);
    }

    return results;
  }

  /**
   * プロセッサ統計を取得
   */
  getStats(): {
    processorCount: number;
    totalPending: number;
    totalProcessed: number;
    totalFailed: number;
  } {
    let totalPending = 0;
    let totalProcessed = 0;
    let totalFailed = 0;

    for (const processor of this.processors.values()) {
      const stats = processor.getStats();
      totalPending += stats.pending;
      totalProcessed += stats.processed;
      totalFailed += stats.failed;
    }

    return {
      processorCount: this.processors.size,
      totalPending,
      totalProcessed,
      totalFailed,
    };
  }

  /**
   * リセット
   */
  reset(): void {
    for (const processor of this.processors.values()) {
      processor.reset();
    }
    this.processors.clear();
  }
}
