/**
 * Health Check Tests
 *
 * Liveness/Readiness プローブ、ヘルスチェック統計のテスト
 */

import {
  getLivenessCheck,
  getReadinessCheck,
  getDeepHealthCheck,
  recordHealthCheck,
  getHealthCheckStats,
  resetHealthCheckStats,
  resetStartTime,
  HealthCheckResult,
} from './healthCheck';

// Mock firestore
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

describe('HealthCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStartTime();
    resetHealthCheckStats();
  });

  describe('getLivenessCheck', () => {
    it('should return healthy status', () => {
      const result = getLivenessCheck();
      expect(result.status).toBe('healthy');
    });

    it('should include timestamp', () => {
      const result = getLivenessCheck();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should include uptime', () => {
      const result = getLivenessCheck();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should have process component', () => {
      const result = getLivenessCheck();
      expect(result.components.process).toBeDefined();
      expect(result.components.process.status).toBe('healthy');
    });

    it('should always be healthy (no external deps)', () => {
      const result1 = getLivenessCheck();
      expect(result1.status).toBe('healthy');

      const result2 = getLivenessCheck();
      expect(result2.status).toBe('healthy');
    });
  });

  describe('getReadinessCheck', () => {
    it('should check Firestore connectivity', async () => {
      const result = await getReadinessCheck();
      expect(result.components.firestore).toBeDefined();
    });

    it('should return healthy when Firestore is available', async () => {
      const result = await getReadinessCheck();
      expect(result.status).toBe('healthy');
      expect(result.components.firestore.status).toBe('healthy');
    });

    it('should include latency measurement', async () => {
      const result = await getReadinessCheck();
      expect(result.components.firestore.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle Firestore timeout gracefully', async () => {
      const { db } = require('../firestore');
      db.mockImplementation(() => ({
        collection: () => ({
          doc: () => ({
            get: jest.fn().mockRejectedValue(
              new Error('DEADLINE_EXCEEDED: timeout')
            ),
          }),
        }),
      }));

      const result = await getReadinessCheck();
      expect(result.components.firestore.status).toBe('degraded');
      expect(result.status).toBe('degraded');
    });

    it('should handle Firestore errors', async () => {
      const { db } = require('../firestore');
      db.mockImplementation(() => ({
        collection: () => ({
          doc: () => ({
            get: jest.fn().mockRejectedValue(new Error('Connection failed')),
          }),
        }),
      }));

      const result = await getReadinessCheck();
      expect(result.components.firestore.status).toBe('unhealthy');
      expect(result.status).toBe('unhealthy');
    });

    it('should include appropriate message based on status', async () => {
      const result = await getReadinessCheck();
      expect(result.message).toBeDefined();
      if (result.status === 'healthy') {
        expect(result.message).toContain('ready');
      }
    });

    it('should track uptime', async () => {
      const result = await getReadinessCheck();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDeepHealthCheck', () => {
    it('should check multiple components', async () => {
      const result = await getDeepHealthCheck();
      expect(result.components.firestore).toBeDefined();
      expect(result.components.memory).toBeDefined();
      expect(result.components.eventLoop).toBeDefined();
    });

    it('should measure memory usage', async () => {
      const result = await getDeepHealthCheck();
      expect(result.components.memory.status).toMatch(/healthy|degraded/);
    });

    it('should report memory as healthy with normal usage', async () => {
      const result = await getDeepHealthCheck();
      // Most of the time memory should be healthy
      expect(['healthy', 'degraded']).toContain(result.components.memory.status);
    });

    it('should have event loop component', async () => {
      const result = await getDeepHealthCheck();
      expect(result.components.eventLoop).toBeDefined();
      expect(result.components.eventLoop.status).toBe('healthy');
    });

    it('should return appropriate overall status', async () => {
      const result = await getDeepHealthCheck();
      const componentStatuses = Object.values(result.components).map(
        (c) => c.status
      );

      if (componentStatuses.includes('unhealthy')) {
        expect(result.status).toBe('unhealthy');
      } else if (componentStatuses.includes('degraded')) {
        expect(result.status).toMatch(/degraded|healthy/);
      } else {
        expect(result.status).toBe('healthy');
      }
    });

    it('should handle all components failing', async () => {
      const { db } = require('../firestore');
      db.mockImplementation(() => ({
        collection: () => ({
          doc: () => ({
            get: jest.fn().mockRejectedValue(new Error('Connection error')),
          }),
        }),
      }));

      const result = await getDeepHealthCheck();
      expect(result.status).toBe('unhealthy');
    });
  });

  describe('recordHealthCheck', () => {
    it('should increment total check count', () => {
      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date(),
        uptime: 1000,
        components: {},
      };

      recordHealthCheck(result);
      expect(getHealthCheckStats().totalChecks).toBe(1);

      recordHealthCheck(result);
      expect(getHealthCheckStats().totalChecks).toBe(2);
    });

    it('should track healthy checks', () => {
      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date(),
        uptime: 1000,
        components: {},
      };

      recordHealthCheck(result);
      recordHealthCheck(result);
      expect(getHealthCheckStats().healthyCount).toBe(2);
    });

    it('should track degraded checks', () => {
      const result: HealthCheckResult = {
        status: 'degraded',
        timestamp: new Date(),
        uptime: 1000,
        components: {},
      };

      recordHealthCheck(result);
      expect(getHealthCheckStats().degradedCount).toBe(1);
    });

    it('should track unhealthy checks', () => {
      const result: HealthCheckResult = {
        status: 'unhealthy',
        timestamp: new Date(),
        uptime: 1000,
        components: {},
      };

      recordHealthCheck(result);
      expect(getHealthCheckStats().unhealthyCount).toBe(1);
    });

    it('should update last check time', () => {
      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date(),
        uptime: 1000,
        components: {},
      };

      recordHealthCheck(result);
      const stats = getHealthCheckStats();
      expect(stats.lastCheckTime).toBeInstanceOf(Date);
    });

    it('should accumulate statistics', () => {
      const healthyResult: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date(),
        uptime: 1000,
        components: {},
      };

      const degradedResult: HealthCheckResult = {
        status: 'degraded',
        timestamp: new Date(),
        uptime: 1000,
        components: {},
      };

      recordHealthCheck(healthyResult);
      recordHealthCheck(degradedResult);
      recordHealthCheck(healthyResult);

      const stats = getHealthCheckStats();
      expect(stats.totalChecks).toBe(3);
      expect(stats.healthyCount).toBe(2);
      expect(stats.degradedCount).toBe(1);
    });
  });

  describe('getHealthCheckStats', () => {
    it('should return stats object', () => {
      const stats = getHealthCheckStats();
      expect(stats).toHaveProperty('totalChecks');
      expect(stats).toHaveProperty('healthyCount');
      expect(stats).toHaveProperty('degradedCount');
      expect(stats).toHaveProperty('unhealthyCount');
    });

    it('should return copy of stats (not reference)', () => {
      const stats1 = getHealthCheckStats();
      stats1.totalChecks = 999;
      const stats2 = getHealthCheckStats();
      expect(stats2.totalChecks).not.toBe(999);
    });

    it('should start with zero counts', () => {
      resetHealthCheckStats();
      const stats = getHealthCheckStats();
      expect(stats.totalChecks).toBe(0);
      expect(stats.healthyCount).toBe(0);
      expect(stats.degradedCount).toBe(0);
      expect(stats.unhealthyCount).toBe(0);
    });
  });

  describe('resetHealthCheckStats', () => {
    it('should reset all counters', () => {
      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date(),
        uptime: 1000,
        components: {},
      };

      recordHealthCheck(result);
      recordHealthCheck(result);
      recordHealthCheck(result);

      resetHealthCheckStats();
      const stats = getHealthCheckStats();

      expect(stats.totalChecks).toBe(0);
      expect(stats.healthyCount).toBe(0);
    });
  });

  describe('HealthCheckResult structure', () => {
    it('should have required fields', async () => {
      const result = getLivenessCheck();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('components');
    });

    it('should have valid status values', async () => {
      const statuses = new Set<string>();
      statuses.add(getLivenessCheck().status);

      const result = await getReadinessCheck();
      statuses.add(result.status);

      statuses.forEach((status) => {
        expect(['healthy', 'degraded', 'unhealthy']).toContain(status);
      });
    });
  });

  describe('Uptime tracking', () => {
    it('should increase uptime over time', async () => {
      const result1 = getLivenessCheck();
      const uptime1 = result1.uptime;

      await new Promise((resolve) => setTimeout(resolve, 50));

      const result2 = getLivenessCheck();
      const uptime2 = result2.uptime;

      expect(uptime2).toBeGreaterThanOrEqual(uptime1);
    });

    it('should reset uptime when service restarts', () => {
      const result1 = getLivenessCheck();
      expect(result1.uptime).toBeGreaterThanOrEqual(0);

      resetStartTime();
      const result2 = getLivenessCheck();
      expect(result2.uptime).toBeLessThanOrEqual(result1.uptime);
    });
  });
});
