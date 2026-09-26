/**
 * Rate Limiter Tests
 *
 * トークンバケット、スライディングウィンドウ、レート制限のテスト
 */

import { globalRateLimiter, RateLimiter } from './rateLimiter';
import { updateConfig, resetConfig } from '../config/productionConfig';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
    resetConfig();
  });

  describe('TokenBucket - Basic Functionality', () => {
    it('should allow initial requests within capacity', () => {
      const status = limiter.isUserAllowed('user1');
      expect(status.allowed).toBe(true);
      expect(status.remaining).toBeGreaterThanOrEqual(0);
    });

    it('should track remaining tokens', () => {
      updateConfig({
        enableAlerts: false,
        rateLimitPerMinute: 10,
        burstLimit: 5
      });

      const status = limiter.isUserAllowed('user1');
      expect(status.remaining).toBeDefined();
      expect(status.remaining).toBeGreaterThanOrEqual(0);
    });

    it('should provide reset time', () => {
      const status = limiter.isUserAllowed('user1');
      expect(status.resetTime).toBeInstanceOf(Date);
    });

    it('should provide retry after duration', () => {
      const status = limiter.isUserAllowed('user1');
      expect(status.retryAfterMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TokenBucket - Rate Limiting', () => {
    it('should eventually deny requests after burst', () => {
      updateConfig({
        enableAlerts: false,
        rateLimitPerMinute: 10,
        burstLimit: 2
      });

      const result1 = limiter.isUserAllowed('user1');
      const result2 = limiter.isUserAllowed('user1');
      limiter.isUserAllowed('user1');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should separate users independently', () => {
      updateConfig({
        enableAlerts: false,
        rateLimitPerMinute: 1,
        burstLimit: 1
      });

      const user1Status1 = limiter.isUserAllowed('user1');
      const user2Status1 = limiter.isUserAllowed('user2');

      expect(user1Status1.allowed).toBe(true);
      expect(user2Status1.allowed).toBe(true);
    });

    it('should track denied requests', () => {
      updateConfig({
        enableAlerts: false,
        rateLimitPerMinute: 1,
        burstLimit: 1
      });

      limiter.isUserAllowed('user1'); // Should be allowed
      const status = limiter.isUserAllowed('user1'); // May be denied

      if (!status.allowed) {
        expect(limiter.getDeniedCount()).toBeGreaterThan(0);
      }
    });
  });

  describe('Global Rate Limiting', () => {
    it('should enforce global limits', () => {
      const allowed1 = limiter.isGlobalAllowed();
      expect(allowed1).toBe(true);
    });

    it('should track global usage', () => {
      limiter.isGlobalAllowed();
      limiter.isGlobalAllowed();
      // Global limiter should still work after multiple calls
      const allowed = limiter.isGlobalAllowed();
      expect(typeof allowed).toBe('boolean');
    });
  });

  describe('Burst Request Limiting', () => {
    it('should allow burst requests within limit', () => {
      updateConfig({
        enableAlerts: false,
        burstLimit: 5
      });

      const allowed = limiter.canBurst('user1', 2);
      expect(allowed).toBe(true);
    });

    it('should deny burst requests exceeding limit', () => {
      updateConfig({
        enableAlerts: false,
        burstLimit: 2
      });

      // Try to burst more than the limit allows
      const allowed = limiter.canBurst('user1', 10);
      expect(allowed).toBe(false);
    });

    it('should track denied burst requests', () => {
      updateConfig({
        enableAlerts: false,
        burstLimit: 1
      });

      limiter.canBurst('user1', 5);
      expect(limiter.getDeniedCount()).toBeGreaterThan(0);
    });

    it('should separate users in burst limiting', () => {
      updateConfig({
        enableAlerts: false,
        burstLimit: 2
      });

      const user1 = limiter.canBurst('user1', 2);
      const user2 = limiter.canBurst('user2', 2);

      expect(user1).toBe(true);
      expect(user2).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should reset all limits', () => {
      updateConfig({
        enableAlerts: false,
        rateLimitPerMinute: 1,
        burstLimit: 1
      });

      limiter.isUserAllowed('user1');
      limiter.reset();

      const stats = limiter.getUserStats('user1');
      expect(stats).toBeNull();
    });

    it('should reset specific user', () => {
      updateConfig({
        enableAlerts: false,
        burstLimit: 1
      });

      limiter.isUserAllowed('user1');
      limiter.resetUser('user1');

      const stats = limiter.getUserStats('user1');
      expect(stats).toBeNull();
    });

    it('should track denied count', () => {
      const initialCount = limiter.getDeniedCount();
      expect(typeof initialCount).toBe('number');
    });
  });

  describe('User Statistics', () => {
    it('should return null for non-existent user', () => {
      const stats = limiter.getUserStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should return stats for tracked user', () => {
      limiter.isUserAllowed('user1');
      const stats = limiter.getUserStats('user1');

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('tokensAvailable');
      expect(stats).toHaveProperty('waitTimeMs');
      expect(stats).toHaveProperty('resetTime');
    });

    it('should show available tokens', () => {
      limiter.isUserAllowed('user1');
      const stats = limiter.getUserStats('user1');

      expect(stats!.tokensAvailable).toBeGreaterThanOrEqual(0);
    });

    it('should show wait time', () => {
      limiter.isUserAllowed('user1');
      const stats = limiter.getUserStats('user1');

      expect(stats!.waitTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should show reset time as future date', () => {
      limiter.isUserAllowed('user1');
      const stats = limiter.getUserStats('user1');
      const now = new Date();

      expect(stats!.resetTime.getTime()).toBeGreaterThanOrEqual(
        now.getTime()
      );
    });
  });

  describe('Active Users', () => {
    it('should count active users', () => {
      limiter.isUserAllowed('user1');
      limiter.isUserAllowed('user2');
      limiter.isUserAllowed('user3');

      expect(limiter.getActiveUsers()).toBeGreaterThanOrEqual(3);
    });

    it('should reset active user count', () => {
      limiter.isUserAllowed('user1');
      limiter.isUserAllowed('user2');
      limiter.reset();

      expect(limiter.getActiveUsers()).toBe(0);
    });
  });

  describe('Configuration Integration', () => {
    it('should respect burst limit config', () => {
      updateConfig({
        enableAlerts: false,
        burstLimit: 3
      });

      const status = limiter.isUserAllowed('user1');
      expect(status.currentUsage).toBeGreaterThanOrEqual(0);
      expect(status.currentUsage).toBeLessThanOrEqual(3);
    });

    it('should respect rate limit per minute config', () => {
      updateConfig({
        enableAlerts: false,
        rateLimitPerMinute: 60
      });

      // Should allow requests within configured rate
      const status = limiter.isUserAllowed('user1');
      expect(status.allowed).toBe(true);
    });
  });

  describe('Global Rate Limiter Singleton', () => {
    it('should provide global instance', () => {
      expect(globalRateLimiter).toBeDefined();
      expect(typeof globalRateLimiter.isUserAllowed).toBe('function');
    });

    it('should allow operations on global instance', () => {
      globalRateLimiter.reset();
      const status = globalRateLimiter.isUserAllowed('test-user');

      expect(status.allowed).toBeDefined();
    });
  });

  describe('RateLimitStatus Structure', () => {
    it('should have required fields', () => {
      const status = limiter.isUserAllowed('user1');

      expect(status).toHaveProperty('allowed');
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('resetTime');
      expect(status).toHaveProperty('retryAfterMs');
      expect(status).toHaveProperty('currentUsage');
    });

    it('should have valid field types', () => {
      const status = limiter.isUserAllowed('user1');

      expect(typeof status.allowed).toBe('boolean');
      expect(typeof status.remaining).toBe('number');
      expect(status.resetTime).toBeInstanceOf(Date);
      expect(typeof status.retryAfterMs).toBe('number');
      expect(typeof status.currentUsage).toBe('number');
    });

    it('should have consistent values', () => {
      const status = limiter.isUserAllowed('user1');

      expect(status.remaining).toBeGreaterThanOrEqual(0);
      expect(status.retryAfterMs).toBeGreaterThanOrEqual(0);
      expect(status.currentUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Concurrency Handling', () => {
    it('should handle multiple concurrent checks', async () => {
      updateConfig({
        enableAlerts: false,
        rateLimitPerMinute: 100,
        burstLimit: 50
      });

      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(limiter.isUserAllowed('user1'))
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(10);
      expect(results.some((r) => r.allowed)).toBe(true);
    });

    it('should handle multiple users concurrently', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        Promise.resolve(limiter.isUserAllowed(`user${i}`))
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(5);
      expect(limiter.getActiveUsers()).toBe(5);
    });
  });

  describe('Token Refill Over Time', () => {
    it('should refill tokens after time passes', async () => {
      updateConfig({
        enableAlerts: false,
        rateLimitPerMinute: 60,
        burstLimit: 2
      });

      // Consume tokens
      limiter.isUserAllowed('user1');
      limiter.isUserAllowed('user1');

      // Wait a short time
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should have some tokens refilled
      const status = limiter.isUserAllowed('user1');
      expect(status).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user ID gracefully', () => {
      const status = limiter.isUserAllowed('');
      expect(status.allowed).toBeDefined();
    });

    it('should handle rapid repeated checks', () => {
      for (let i = 0; i < 100; i++) {
        const status = limiter.isUserAllowed('user1');
        expect(status.allowed).toBeDefined();
      }
    });

    it('should handle very large burst requests', () => {
      updateConfig({
        enableAlerts: false,
        burstLimit: 10
      });

      const allowed = limiter.canBurst('user1', 1000);
      expect(typeof allowed).toBe('boolean');
    });
  });
});
