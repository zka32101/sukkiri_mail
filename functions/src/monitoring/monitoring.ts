/**
 * Monitoring and Alerting Service
 *
 * メトリクス収集、アラート管理、パフォーマンス監視
 * - リアルタイムメトリクス
 * - アラート閾値の判定
 * - パフォーマンス統計
 */

import { logger } from 'firebase-functions/v2';
import { getConfig } from '../config/productionConfig';

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface MetricStats {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  lastUpdated: Date;
}

export interface Alert {
  id: string;
  name: string;
  severity: 'info' | 'warning' | 'critical';
  threshold: number;
  currentValue: number;
  timestamp: Date;
  message: string;
  resolved: boolean;
}

/**
 * メトリクス収集エンジン
 */
class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private metricTimestamps: Map<string, Date[]> = new Map();
  private readonly maxMetricHistory = 10000; // 最大10000データポイント

  /**
   * メトリクスを記録
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
      this.metricTimestamps.set(name, []);
    }

    const values = this.metrics.get(name)!;
    const timestamps = this.metricTimestamps.get(name)!;

    values.push(value);
    timestamps.push(new Date());

    // 履歴の最大数を超えたら削除
    if (values.length > this.maxMetricHistory) {
      values.shift();
      timestamps.shift();
    }
  }

  /**
   * メトリクス統計を取得
   */
  getStats(name: string): MetricStats | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // パーセンタイル計算
    const p50 = this.percentile(sorted, 0.5);
    const p95 = this.percentile(sorted, 0.95);
    const p99 = this.percentile(sorted, 0.99);

    return {
      name,
      count: values.length,
      sum,
      min,
      max,
      avg,
      p50,
      p95,
      p99,
      lastUpdated: this.metricTimestamps.get(name)!.slice(-1)[0],
    };
  }

  /**
   * パーセンタイルを計算
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 直近Nデータの平均を取得
   */
  getRecentAverage(name: string, count: number): number | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const recent = values.slice(-count);
    const sum = recent.reduce((a, b) => a + b, 0);
    return sum / recent.length;
  }

  /**
   * すべてのメトリクスをクリア（テスト用）
   */
  clear(): void {
    this.metrics.clear();
    this.metricTimestamps.clear();
  }

  /**
   * 全メトリクス名を取得
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }
}

/**
 * アラート管理
 */
class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private readonly maxAlertHistory = 1000;

  /**
   * アラートを発火
   */
  raiseAlert(
    name: string,
    severity: 'info' | 'warning' | 'critical',
    currentValue: number,
    threshold: number,
    message: string
  ): Alert {
    const config = getConfig();
    const shouldAlert =
      config.enableAlerts &&
      (severity === 'critical' || severity === 'warning');

    if (!shouldAlert) {
      return {
        id: `${name}-${Date.now()}`,
        name,
        severity,
        threshold,
        currentValue,
        timestamp: new Date(),
        message,
        resolved: false,
      };
    }

    const alertId = name;
    const alert: Alert = {
      id: alertId,
      name,
      severity,
      threshold,
      currentValue,
      timestamp: new Date(),
      message,
      resolved: false,
    };

    this.alerts.set(alertId, alert);
    this.addToHistory(alert);

    // ログに記録
    if (severity === 'critical') {
      logger.error(`ALERT [${name}]: ${message}`);
    } else if (severity === 'warning') {
      logger.warn(`ALERT [${name}]: ${message}`);
    } else {
      logger.info(`ALERT [${name}]: ${message}`);
    }

    return alert;
  }

  /**
   * アラートを解決
   */
  resolveAlert(name: string): void {
    const alert = this.alerts.get(name);
    if (alert) {
      alert.resolved = true;
      this.alerts.delete(name);
      logger.info(`Alert resolved: ${name}`);
    }
  }

  /**
   * アクティブなアラートを取得
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => !a.resolved);
  }

  /**
   * 全アラート履歴を取得
   */
  getAlertHistory(): Alert[] {
    return [...this.alertHistory];
  }

  /**
   * アラート履歴に追加
   */
  private addToHistory(alert: Alert): void {
    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory.shift();
    }
  }

  /**
   * アラートをクリア（テスト用）
   */
  clear(): void {
    this.alerts.clear();
    this.alertHistory = [];
  }
}

/**
 * パフォーマンスモニター
 */
class PerformanceMonitor {
  private metricsCollector = new MetricsCollector();
  private alertManager = new AlertManager();

  /**
   * 操作の実行時間を測定
   */
  async measureOperation<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; latencyMs: number }> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const latencyMs = Date.now() - startTime;
      this.metricsCollector.recordMetric(`${name}.latency`, latencyMs);
      return { result, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.metricsCollector.recordMetric(`${name}.error_latency`, latencyMs);
      throw error;
    }
  }

  /**
   * エラーレートをチェック
   */
  checkErrorRate(
    operationName: string,
    errorCount: number,
    totalCount: number
  ): void {
    if (totalCount === 0) return;

    const errorRate = (errorCount / totalCount) * 100;
    this.metricsCollector.recordMetric(`${operationName}.error_rate`, errorRate);

    const config = getConfig();
    if (errorRate > config.alertThresholds.errorRatePercent) {
      this.alertManager.raiseAlert(
        `${operationName}.error_rate`,
        'warning',
        errorRate,
        config.alertThresholds.errorRatePercent,
        `Error rate ${errorRate.toFixed(2)}% exceeds threshold ${config.alertThresholds.errorRatePercent}%`
      );
    }
  }

  /**
   * レイテンシをチェック
   */
  checkLatency(operationName: string, latencyMs: number): void {
    this.metricsCollector.recordMetric(`${operationName}.latency`, latencyMs);

    const config = getConfig();
    if (latencyMs > config.alertThresholds.latencyMs) {
      this.alertManager.raiseAlert(
        `${operationName}.latency`,
        'warning',
        latencyMs,
        config.alertThresholds.latencyMs,
        `Latency ${latencyMs}ms exceeds threshold ${config.alertThresholds.latencyMs}ms`
      );
    }
  }

  /**
   * メトリクス統計を取得
   */
  getMetricStats(name: string): MetricStats | null {
    return this.metricsCollector.getStats(name);
  }

  /**
   * 直近平均を取得
   */
  getRecentAverage(name: string, count: number = 10): number | null {
    return this.metricsCollector.getRecentAverage(name, count);
  }

  /**
   * メトリクス名一覧を取得
   */
  getMetricNames(): string[] {
    return this.metricsCollector.getMetricNames();
  }

  /**
   * アクティブなアラートを取得
   */
  getActiveAlerts(): Alert[] {
    return this.alertManager.getActiveAlerts();
  }

  /**
   * アラート履歴を取得
   */
  getAlertHistory(): Alert[] {
    return this.alertManager.getAlertHistory();
  }

  /**
   * アラートを解決
   */
  resolveAlert(name: string): void {
    this.alertManager.resolveAlert(name);
  }

  /**
   * モニタリング状態をクリア（テスト用）
   */
  clear(): void {
    this.metricsCollector.clear();
    this.alertManager.clear();
  }

  /**
   * パフォーマンスサマリーを取得
   */
  getSummary(): {
    metrics: string[];
    activeAlerts: number;
    alertHistory: number;
  } {
    return {
      metrics: this.getMetricNames(),
      activeAlerts: this.getActiveAlerts().length,
      alertHistory: this.getAlertHistory().length,
    };
  }
}

/**
 * グローバルパフォーマンスモニター
 */
export const performanceMonitor = new PerformanceMonitor();
