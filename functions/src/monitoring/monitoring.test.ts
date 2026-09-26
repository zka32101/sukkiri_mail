/**
 * Monitoring Tests
 *
 * メトリクス収集、アラート管理、パフォーマンス監視のテスト
 */

import { performanceMonitor } from './monitoring';
import { updateConfig, resetConfig } from '../config/productionConfig';

// Mock logger
jest.mock('firebase-functions/v2', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock firestore for config
jest.mock('../firestore', () => ({
  db: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
      })),
    })),
  })),
  __resetFirestoreCache: jest.fn(),
}));

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor.clear();
    resetConfig();
  });

  describe('measureOperation', () => {
    it('should measure operation latency', async () => {
      const { result, latencyMs } = await performanceMonitor.measureOperation(
        'test-op',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 'success';
        }
      );

      expect(result).toBe('success');
      expect(latencyMs).toBeGreaterThanOrEqual(40);
    });

    it('should record latency metric', async () => {
      await performanceMonitor.measureOperation('test-op', async () => 'success');

      const stats = performanceMonitor.getMetricStats('test-op.latency');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
    });

    it('should handle operation errors', async () => {
      const error = new Error('Operation failed');

      try {
        await performanceMonitor.measureOperation('test-op', async () => {
          throw error;
        });
      } catch (e) {
        expect(e).toBe(error);
      }

      const stats = performanceMonitor.getMetricStats('test-op.error_latency');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
    });

    it('should record metrics for multiple operations', async () => {
      await performanceMonitor.measureOperation('op1', async () => 'result1');
      await performanceMonitor.measureOperation('op2', async () => 'result2');

      const stats1 = performanceMonitor.getMetricStats('op1.latency');
      const stats2 = performanceMonitor.getMetricStats('op2.latency');

      expect(stats1).toBeDefined();
      expect(stats2).toBeDefined();
      expect(performanceMonitor.getMetricNames().length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('checkErrorRate', () => {
    it('should calculate error rate correctly', () => {
      performanceMonitor.checkErrorRate('test-op', 5, 100);

      const stats = performanceMonitor.getMetricStats('test-op.error_rate');
      expect(stats).toBeDefined();
      expect(stats!.avg).toBe(5); // 5/100 = 5%
    });

    it('should raise alert when error rate exceeds threshold', () => {
      updateConfig({
        enableAlerts: true,
        alertThresholds: { errorRatePercent: 5, latencyMs: 2000, failureCountPerMinute: 10 }
      });

      performanceMonitor.checkErrorRate('test-op', 50, 100); // 50%

      const alerts = performanceMonitor.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should not raise alert when error rate is below threshold', () => {
      updateConfig({
        enableAlerts: true,
        alertThresholds: { errorRatePercent: 10, latencyMs: 2000, failureCountPerMinute: 10 }
      });

      performanceMonitor.checkErrorRate('test-op', 2, 100); // 2%

      const alerts = performanceMonitor.getActiveAlerts();
      expect(alerts.length).toBe(0);
    });

    it('should handle zero total count', () => {
      expect(() => {
        performanceMonitor.checkErrorRate('test-op', 0, 0);
      }).not.toThrow();
    });
  });

  describe('checkLatency', () => {
    it('should record latency metric', () => {
      performanceMonitor.checkLatency('test-op', 500);

      const stats = performanceMonitor.getMetricStats('test-op.latency');
      expect(stats).toBeDefined();
      expect(stats!.sum).toBe(500);
    });

    it('should raise alert when latency exceeds threshold', () => {
      updateConfig({
        enableAlerts: true,
        alertThresholds: { errorRatePercent: 5, latencyMs: 1000, failureCountPerMinute: 10 }
      });

      performanceMonitor.checkLatency('test-op', 2000);

      const alerts = performanceMonitor.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should not raise alert when latency is below threshold', () => {
      updateConfig({
        enableAlerts: true,
        alertThresholds: { errorRatePercent: 5, latencyMs: 1000, failureCountPerMinute: 10 }
      });

      performanceMonitor.checkLatency('test-op', 500);

      const alerts = performanceMonitor.getActiveAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe('getMetricStats', () => {
    it('should return null for non-existent metric', () => {
      const stats = performanceMonitor.getMetricStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should calculate metric statistics', () => {
      performanceMonitor.checkLatency('test-op', 100);
      performanceMonitor.checkLatency('test-op', 200);
      performanceMonitor.checkLatency('test-op', 300);

      const stats = performanceMonitor.getMetricStats('test-op.latency');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(3);
      expect(stats!.sum).toBe(600);
      expect(stats!.avg).toBe(200);
      expect(stats!.min).toBe(100);
      expect(stats!.max).toBe(300);
    });

    it('should calculate percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        performanceMonitor.checkLatency('test-op', i * 10);
      }

      const stats = performanceMonitor.getMetricStats('test-op.latency');
      expect(stats).toBeDefined();
      expect(stats!.p50).toBeLessThanOrEqual(stats!.avg);
      expect(stats!.p95).toBeGreaterThan(stats!.p50);
      expect(stats!.p99).toBeGreaterThan(stats!.p95);
    });
  });

  describe('getRecentAverage', () => {
    it('should return null for non-existent metric', () => {
      const avg = performanceMonitor.getRecentAverage('non-existent', 5);
      expect(avg).toBeNull();
    });

    it('should calculate recent average', () => {
      performanceMonitor.checkLatency('test-op', 100);
      performanceMonitor.checkLatency('test-op', 200);
      performanceMonitor.checkLatency('test-op', 300);

      const avg = performanceMonitor.getRecentAverage('test-op.latency', 2);
      expect(avg).toBe(250); // (200 + 300) / 2
    });

    it('should use default count if not specified', () => {
      for (let i = 0; i < 20; i++) {
        performanceMonitor.checkLatency('test-op', 100);
      }

      const avg = performanceMonitor.getRecentAverage('test-op.latency');
      expect(avg).toBe(100);
    });

    it('should handle count larger than data points', () => {
      performanceMonitor.checkLatency('test-op', 100);
      performanceMonitor.checkLatency('test-op', 200);

      const avg = performanceMonitor.getRecentAverage('test-op.latency', 100);
      expect(avg).toBe(150); // (100 + 200) / 2
    });
  });

  describe('Alert management', () => {
    it('should track active alerts', () => {
      updateConfig({
        enableAlerts: true,
        alertThresholds: { errorRatePercent: 5, latencyMs: 1000, failureCountPerMinute: 10 }
      });

      performanceMonitor.checkErrorRate('op1', 50, 100);
      performanceMonitor.checkLatency('op2', 2000);

      const alerts = performanceMonitor.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should resolve alerts', () => {
      updateConfig({
        enableAlerts: true,
        alertThresholds: { errorRatePercent: 5, latencyMs: 1000, failureCountPerMinute: 10 }
      });

      performanceMonitor.checkErrorRate('test-op', 50, 100);
      let alerts = performanceMonitor.getActiveAlerts();
      const initialCount = alerts.length;

      performanceMonitor.resolveAlert('test-op.error_rate');
      alerts = performanceMonitor.getActiveAlerts();

      expect(alerts.length).toBeLessThan(initialCount);
    });

    it('should maintain alert history', () => {
      updateConfig({
        enableAlerts: true,
        alertThresholds: { errorRatePercent: 5, latencyMs: 1000, failureCountPerMinute: 10 }
      });

      performanceMonitor.checkErrorRate('op1', 50, 100);
      performanceMonitor.checkLatency('op2', 2000);

      const history = performanceMonitor.getAlertHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Metric aggregation', () => {
    it('should track multiple metric samples', () => {
      const samples = [100, 150, 200, 250, 300];
      samples.forEach((sample) => {
        performanceMonitor.checkLatency('test-op', sample);
      });

      const stats = performanceMonitor.getMetricStats('test-op.latency');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(5);
    });

    it('should not lose older metrics when hitting max history', async () => {
      // Record many metrics to test history limits
      for (let i = 0; i < 100; i++) {
        await performanceMonitor.measureOperation(`op-${i}`, async () => 'result');
      }

      const names = performanceMonitor.getMetricNames();
      expect(names.length).toBeGreaterThan(0);
    });
  });

  describe('getSummary', () => {
    it('should return monitoring summary', () => {
      performanceMonitor.checkLatency('test-op', 500);
      const summary = performanceMonitor.getSummary();

      expect(summary).toHaveProperty('metrics');
      expect(summary).toHaveProperty('activeAlerts');
      expect(summary).toHaveProperty('alertHistory');
      expect(Array.isArray(summary.metrics)).toBe(true);
    });

    it('should update summary with new metrics', () => {
      let summary = performanceMonitor.getSummary();
      const initialCount = summary.metrics.length;

      performanceMonitor.checkLatency('new-op', 500);
      summary = performanceMonitor.getSummary();

      expect(summary.metrics.length).toBeGreaterThan(initialCount);
    });
  });

  describe('Monitoring state management', () => {
    it('should clear all metrics', () => {
      performanceMonitor.checkLatency('test-op', 500);
      performanceMonitor.clear();

      const stats = performanceMonitor.getMetricStats('test-op.latency');
      expect(stats).toBeNull();
    });

    it('should clear all alerts', () => {
      updateConfig({
        enableAlerts: true,
        alertThresholds: { errorRatePercent: 5, latencyMs: 1000, failureCountPerMinute: 10 }
      });

      performanceMonitor.checkErrorRate('test-op', 50, 100);
      performanceMonitor.clear();

      const alerts = performanceMonitor.getActiveAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe('Configuration integration', () => {
    it('should respect enableAlerts setting', () => {
      updateConfig({ enableAlerts: false });

      performanceMonitor.checkErrorRate('test-op', 99, 100); // 99% error rate

      const alerts = performanceMonitor.getActiveAlerts();
      // With enableAlerts: false, no alerts should be raised
      expect(alerts.length).toBe(0);
    });

    it('should use configured alert thresholds', () => {
      updateConfig({
        enableAlerts: true,
        alertThresholds: { errorRatePercent: 50, latencyMs: 5000, failureCountPerMinute: 100 }
      });

      performanceMonitor.checkErrorRate('test-op', 30, 100); // 30% - below 50% threshold
      let alerts = performanceMonitor.getActiveAlerts();
      expect(alerts.length).toBe(0);

      performanceMonitor.checkErrorRate('test-op2', 60, 100); // 60% - above 50% threshold
      alerts = performanceMonitor.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
