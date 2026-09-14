/**
 * Performance Monitoring Service
 *
 * メトリクス収集、レイテンシ測定、パフォーマンス分析
 */

import { logger } from 'firebase-functions/v2';

export interface PerformanceMetric {
  operationName: string;
  durationMs: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  tags?: Record<string, string | number>;
}

export interface PerformanceStats {
  operationName: string;
  count: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p95Ms: number; // 95th percentile
  p99Ms: number; // 99th percentile
  errorRate: number; // 0.0-1.0
  lastUpdated: Date;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private stats: Map<string, PerformanceStats> = new Map();
  private readonly maxMetricsPerOperation = 1000; // Keep last 1000 metrics per operation

  /**
   * 操作のパフォーマンスを計測
   */
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    tags?: Record<string, string | number>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const durationMs = Date.now() - startTime;

      this.recordMetric({
        operationName,
        durationMs,
        timestamp: new Date(),
        success: true,
        tags,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.recordMetric({
        operationName,
        durationMs,
        timestamp: new Date(),
        success: false,
        errorMessage,
        tags,
      });

      throw error;
    }
  }

  /**
   * メトリクスを記録
   */
  private recordMetric(metric: PerformanceMetric): void {
    // Get or create metrics array for this operation
    if (!this.metrics.has(metric.operationName)) {
      this.metrics.set(metric.operationName, []);
    }

    const operationMetrics = this.metrics.get(metric.operationName)!;
    operationMetrics.push(metric);

    // Keep only the last N metrics to avoid memory growth
    if (operationMetrics.length > this.maxMetricsPerOperation) {
      operationMetrics.shift();
    }

    // Update stats
    this.updateStats(metric.operationName);

    // Log warning if operation is slow
    if (metric.success && metric.durationMs > 1000) {
      logger.warn(
        `Slow operation detected: ${metric.operationName} took ${metric.durationMs}ms`
      );
    }
  }

  /**
   * 統計情報を更新
   */
  private updateStats(operationName: string): void {
    const metrics = this.metrics.get(operationName) || [];
    if (metrics.length === 0) return;

    const durations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);
    const failures = metrics.filter((m) => !m.success).length;

    const stats: PerformanceStats = {
      operationName,
      count: metrics.length,
      minMs: Math.min(...durations),
      maxMs: Math.max(...durations),
      avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95Ms: durations[Math.floor(durations.length * 0.95)] || 0,
      p99Ms: durations[Math.floor(durations.length * 0.99)] || 0,
      errorRate: failures / metrics.length,
      lastUpdated: new Date(),
    };

    this.stats.set(operationName, stats);
  }

  /**
   * 操作の統計情報を取得
   */
  getStats(operationName: string): PerformanceStats | undefined {
    return this.stats.get(operationName);
  }

  /**
   * すべての統計情報を取得
   */
  getAllStats(): PerformanceStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * パフォーマンスレポート（JSON形式）
   */
  generateReport(): Record<string, PerformanceStats> {
    const report: Record<string, PerformanceStats> = {};
    this.stats.forEach((stats, name) => {
      report[name] = stats;
    });
    return report;
  }

  /**
   * パフォーマンスの問題をチェック
   */
  checkPerformanceIssues(): string[] {
    const issues: string[] = [];

    this.stats.forEach((stats) => {
      // Check error rate
      if (stats.errorRate > 0.05) {
        issues.push(
          `${stats.operationName}: High error rate (${(stats.errorRate * 100).toFixed(2)}%)`
        );
      }

      // Check average latency
      if (stats.avgMs > 500) {
        issues.push(
          `${stats.operationName}: High average latency (${stats.avgMs.toFixed(0)}ms)`
        );
      }

      // Check 95th percentile
      if (stats.p95Ms > 2000) {
        issues.push(
          `${stats.operationName}: High P95 latency (${stats.p95Ms.toFixed(0)}ms)`
        );
      }
    });

    return issues;
  }

  /**
   * メトリクスをクリア（テスト用）
   */
  clear(): void {
    this.metrics.clear();
    this.stats.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();
