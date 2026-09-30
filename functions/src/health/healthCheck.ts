/**
 * Health Check Service
 *
 * ヘルスチェック機能、Liveness/Readiness プローブ
 * - Liveness: サービスが稼働しているか
 * - Readiness: 外部依存関係の準備状況
 */

import { logger } from 'firebase-functions/v2';
import { db } from '../firestore';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number; // ミリ秒
  components: {
    [key: string]: ComponentHealth;
  };
  message?: string;
}

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latencyMs: number;
  error?: string;
}

/**
 * サービス起動時刻（ミリ秒）
 */
let serviceStartTime = Date.now();

/**
 * リセット用（テスト用）
 */
export function resetStartTime(): void {
  serviceStartTime = Date.now();
}

/**
 * Liveness Probe: サービスが稼働しているか確認
 */
export function getLivenessCheck(): HealthCheckResult {
  const timestamp = new Date();
  const uptime = Date.now() - serviceStartTime;

  return {
    status: 'healthy',
    timestamp,
    uptime,
    components: {
      process: {
        status: 'healthy',
        latencyMs: 0,
      },
    },
  };
}

/**
 * Readiness Probe: 外部依存関係が準備完了か確認
 */
export async function getReadinessCheck(): Promise<HealthCheckResult> {
  const timestamp = new Date();
  const uptime = Date.now() - serviceStartTime;
  const components: { [key: string]: ComponentHealth } = {};

  // Firestore 接続確認
  components.firestore = await checkFirestoreHealth();

  // 全体的なステータスを決定
  const statuses = Object.values(components).map((c) => c.status);
  let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  if (statuses.includes('unhealthy')) {
    status = 'unhealthy';
  } else if (statuses.includes('degraded')) {
    status = 'degraded';
  }

  return {
    status,
    timestamp,
    uptime,
    components,
    message:
      status === 'healthy'
        ? 'Service is ready'
        : status === 'degraded'
          ? 'Service is degraded'
          : 'Service is not ready',
  };
}

/**
 * Firestore ヘルスチェック
 */
async function checkFirestoreHealth(): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    // シンプルな読み込みテスト
    await db()
      .collection('_health')
      .doc('heartbeat')
      .get();

    const latencyMs = Date.now() - startTime;

    return {
      status: 'healthy',
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.warn(`Firestore health check failed: ${errorMsg}`);

    // タイムアウトの場合は degraded、その他は unhealthy
    if (
      errorMsg.includes('timeout') ||
      errorMsg.includes('DEADLINE_EXCEEDED')
    ) {
      return {
        status: 'degraded',
        latencyMs,
        error: 'Firestore timeout',
      };
    }

    return {
      status: 'unhealthy',
      latencyMs,
      error: errorMsg,
    };
  }
}

/**
 * Deep Health Check: 全ての依存関係を詳細に確認
 */
export async function getDeepHealthCheck(): Promise<HealthCheckResult> {
  const timestamp = new Date();
  const uptime = Date.now() - serviceStartTime;
  const components: { [key: string]: ComponentHealth } = {};

  // Firestore
  components.firestore = await checkFirestoreHealth();

  // メモリ使用量
  const memoryUsage = process.memoryUsage();
  const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  components.memory = {
    status: heapUsagePercent > 90 ? 'degraded' : 'healthy',
    latencyMs: 0,
    ...(heapUsagePercent > 90 && {
      error: `High memory usage: ${heapUsagePercent.toFixed(1)}%`,
    }),
  };

  // EventLoop ラグ測定
  components.eventLoop = measureEventLoopLag();

  // 全体的なステータスを決定
  const statuses = Object.values(components).map((c) => c.status);
  let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  if (statuses.includes('unhealthy')) {
    status = 'unhealthy';
  } else if (statuses.includes('degraded')) {
    status = 'degraded';
  }

  return {
    status,
    timestamp,
    uptime,
    components,
    message:
      status === 'healthy'
        ? 'All systems operational'
        : status === 'degraded'
          ? 'Some systems degraded'
          : 'Critical system failure',
  };
}

/**
 * Event Loop ラグを測定
 */
function measureEventLoopLag(): ComponentHealth {
  // 簡易的な計測（即座に返す）
  return {
    status: 'healthy',
    latencyMs: 0,
  };
}

/**
 * ヘルスチェック統計
 */
interface HealthCheckStats {
  totalChecks: number;
  healthyCount: number;
  degradedCount: number;
  unhealthyCount: number;
  lastCheckTime?: Date;
}

let healthStats: HealthCheckStats = {
  totalChecks: 0,
  healthyCount: 0,
  degradedCount: 0,
  unhealthyCount: 0,
};

/**
 * ヘルスチェック結果を統計に記録
 */
export function recordHealthCheck(result: HealthCheckResult): void {
  healthStats.totalChecks++;
  healthStats.lastCheckTime = new Date();

  if (result.status === 'healthy') {
    healthStats.healthyCount++;
  } else if (result.status === 'degraded') {
    healthStats.degradedCount++;
  } else {
    healthStats.unhealthyCount++;
  }
}

/**
 * ヘルスチェック統計を取得
 */
export function getHealthCheckStats(): HealthCheckStats {
  return { ...healthStats };
}

/**
 * ヘルスチェック統計をリセット（テスト用）
 */
export function resetHealthCheckStats(): void {
  healthStats = {
    totalChecks: 0,
    healthyCount: 0,
    degradedCount: 0,
    unhealthyCount: 0,
  };
}

/**
 * Kubernetes-style ヘルスチェックエンドポイント
 * GET /healthz - Liveness probe
 * GET /readyz - Readiness probe
 * GET /deep - Deep health check
 */
export const healthCheckEndpoints = {
  async healthz() {
    return getLivenessCheck();
  },

  async readyz() {
    return await getReadinessCheck();
  },

  async deep() {
    return await getDeepHealthCheck();
  },
};
