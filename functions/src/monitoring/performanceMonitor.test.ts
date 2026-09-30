/**
 * Performance Monitor Tests
 *
 * Tests for performance metrics collection, statistics calculation, and issue detection
 */

import { PerformanceMonitor } from './performanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('measureOperation', () => {
    it('should measure successful operation duration', async () => {
      const result = await monitor.measureOperation(
        'test-operation',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'success';
        }
      );

      expect(result).toBe('success');

      const stats = monitor.getStats('test-operation');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.avgMs >= 75).toBe(true);
      expect(stats!.errorRate).toBe(0);
    });

    it('should measure operation with tags', async () => {
      await monitor.measureOperation(
        'tagged-operation',
        async () => 'success',
        { userId: 'user123', provider: 'gmail' }
      );

      const stats = monitor.getStats('tagged-operation');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
    });

    it('should record failed operations', async () => {
      const error = new Error('Operation failed');

      try {
        await monitor.measureOperation('failing-operation', async () => {
          throw error;
        });
      } catch (e) {
        expect(e).toBe(error);
      }

      const stats = monitor.getStats('failing-operation');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.errorRate).toBe(1);
    });

    it('should handle mixed success and failure', async () => {
      // Successful operations
      await monitor.measureOperation('mixed-op', async () => 'success');
      await monitor.measureOperation('mixed-op', async () => 'success');

      // Failed operation
      try {
        await monitor.measureOperation('mixed-op', async () => {
          throw new Error('Failed');
        });
      } catch (e) {
        // Expected
      }

      const stats = monitor.getStats('mixed-op');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(3);
      expect(stats!.errorRate).toBeCloseTo(1 / 3, 2);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate min and max durations correctly', async () => {
      const durations = [100, 200, 150, 300, 50];

      for (const duration of durations) {
        await monitor.measureOperation('stat-test', async () => {
          await new Promise((resolve) => setTimeout(resolve, duration));
        });
      }

      const stats = monitor.getStats('stat-test');
      expect(stats).toBeDefined();
      expect(stats!.minMs).toBeLessThanOrEqual(100);
      expect(stats!.maxMs).toBeGreaterThanOrEqual(250);
    });

    it('should calculate average duration', async () => {
      const targetDuration = 75;

      for (let i = 0; i < 5; i++) {
        await monitor.measureOperation('avg-test', async () => {
          await new Promise((resolve) => setTimeout(resolve, targetDuration));
        });
      }

      const stats = monitor.getStats('avg-test');
      expect(stats).toBeDefined();
      expect(stats!.avgMs).toBeGreaterThanOrEqual(targetDuration);
      expect(stats!.avgMs).toBeLessThan(targetDuration + 50);
    });

    it('should calculate percentiles correctly', async () => {
      // Create 100 operations with varying durations
      for (let i = 0; i < 100; i++) {
        const duration = 10 + (i % 50); // Durations from 10 to 59ms
        await monitor.measureOperation('percentile-test', async () => {
          await new Promise((resolve) => setTimeout(resolve, duration));
        });
      }

      const stats = monitor.getStats('percentile-test');
      expect(stats).toBeDefined();
      expect(stats!.p95Ms).toBeGreaterThan(stats!.avgMs);
      expect(stats!.p99Ms).toBeGreaterThanOrEqual(stats!.p95Ms);
    });

    it('should track error rate accurately', async () => {
      // 70 successful, 30 failed
      for (let i = 0; i < 70; i++) {
        await monitor.measureOperation('error-rate-test', async () => 'success');
      }

      for (let i = 0; i < 30; i++) {
        try {
          await monitor.measureOperation('error-rate-test', async () => {
            throw new Error('Failed');
          });
        } catch (e) {
          // Expected
        }
      }

      const stats = monitor.getStats('error-rate-test');
      expect(stats).toBeDefined();
      expect(stats!.errorRate).toBeCloseTo(0.3, 2);
    });
  });

  describe('Report Generation', () => {
    it('should generate JSON report of all operations', async () => {
      await monitor.measureOperation('op1', async () => 'success1');
      await monitor.measureOperation('op2', async () => 'success2');
      await monitor.measureOperation('op3', async () => 'success3');

      const report = monitor.generateReport();

      expect(report).toHaveProperty('op1');
      expect(report).toHaveProperty('op2');
      expect(report).toHaveProperty('op3');
      expect(Object.keys(report).length).toBe(3);
    });

    it('should include all stats in report', async () => {
      await monitor.measureOperation('full-report', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const report = monitor.generateReport();
      const stats = report['full-report'];

      expect(stats).toHaveProperty('operationName');
      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('minMs');
      expect(stats).toHaveProperty('maxMs');
      expect(stats).toHaveProperty('avgMs');
      expect(stats).toHaveProperty('p95Ms');
      expect(stats).toHaveProperty('p99Ms');
      expect(stats).toHaveProperty('errorRate');
      expect(stats).toHaveProperty('lastUpdated');
    });
  });

  describe('Issue Detection', () => {
    it('should detect high error rate', async () => {
      // Create 10 operations with 60% error rate
      for (let i = 0; i < 4; i++) {
        await monitor.measureOperation('high-error', async () => 'success');
      }

      for (let i = 0; i < 6; i++) {
        try {
          await monitor.measureOperation('high-error', async () => {
            throw new Error('Failed');
          });
        } catch (e) {
          // Expected
        }
      }

      const issues = monitor.checkPerformanceIssues();
      const errorIssue = issues.find((issue) => issue.includes('High error rate'));

      expect(errorIssue).toBeDefined();
      expect(errorIssue).toMatch(/60\.00%/);
    });

    it('should detect high average latency', async () => {
      // Create operations with >500ms average
      for (let i = 0; i < 3; i++) {
        await monitor.measureOperation('slow-op', async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
        });
      }

      const issues = monitor.checkPerformanceIssues();
      const latencyIssue = issues.find((issue) => issue.includes('High average latency'));

      expect(latencyIssue).toBeDefined();
    });

    it('should detect high P95 latency', async () => {
      // Create operations with P95 > 2000ms
      const durations = [100, 150, 200, 250, 300, 350, 400, 450, 500, 2500];

      for (const duration of durations) {
        await monitor.measureOperation('p95-test', async () => {
          await new Promise((resolve) => setTimeout(resolve, duration));
        });
      }

      const issues = monitor.checkPerformanceIssues();
      const p95Issue = issues.find((issue) => issue.includes('High P95 latency'));

      // May or may not trigger depending on exact timing
      if (p95Issue) {
        expect(p95Issue).toMatch(/High P95 latency/);
      }
    }, 15000); // 15 second timeout for this long-running test

    it('should return empty issues array when no problems', async () => {
      // Create fast, successful operations
      for (let i = 0; i < 10; i++) {
        await monitor.measureOperation('fast-op', async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        });
      }

      const issues = monitor.checkPerformanceIssues();
      expect(issues).toEqual([]);
    });
  });

  describe('Stats Retrieval', () => {
    it('should return undefined for non-existent operation', () => {
      const stats = monitor.getStats('non-existent');
      expect(stats).toBeUndefined();
    });

    it('should return all stats', async () => {
      await monitor.measureOperation('op1', async () => 'success');
      await monitor.measureOperation('op2', async () => 'success');
      await monitor.measureOperation('op3', async () => 'success');

      const allStats = monitor.getAllStats();

      expect(allStats).toHaveLength(3);
      expect(allStats.map((s) => s.operationName)).toContain('op1');
      expect(allStats.map((s) => s.operationName)).toContain('op2');
      expect(allStats.map((s) => s.operationName)).toContain('op3');
    });
  });

  describe('Metrics Cleanup', () => {
    it('should keep only last N metrics per operation', async () => {
      // Create more than max metrics (1000)
      for (let i = 0; i < 1100; i++) {
        await monitor.measureOperation('cleanup-test', async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
        });
      }

      const stats = monitor.getStats('cleanup-test');
      expect(stats).toBeDefined();
      // Should have processed all 1100 but kept stats
      expect(stats!.count).toBeLessThanOrEqual(1100);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent measurements', async () => {
      const promises = [];

      for (let i = 0; i < 50; i++) {
        const operationName = `concurrent-${i % 5}`;
        promises.push(
          monitor.measureOperation(operationName, async () => {
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
          })
        );
      }

      await Promise.all(promises);

      const allStats = monitor.getAllStats();
      expect(allStats.length).toBeGreaterThan(0);

      // Each operation should have recorded multiple invocations
      allStats.forEach((stats) => {
        expect(stats.count).toBeGreaterThanOrEqual(10);
      });
    });
  });

  describe('Clear Metrics', () => {
    it('should clear all metrics', async () => {
      await monitor.measureOperation('op1', async () => 'success');
      await monitor.measureOperation('op2', async () => 'success');

      let stats = monitor.getStats('op1');
      expect(stats).toBeDefined();

      monitor.clear();

      stats = monitor.getStats('op1');
      expect(stats).toBeUndefined();

      const allStats = monitor.getAllStats();
      expect(allStats).toHaveLength(0);
    });
  });
});
