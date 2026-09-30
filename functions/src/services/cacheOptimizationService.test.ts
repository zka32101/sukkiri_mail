/**
 * Cache Optimization Service Tests
 *
 * Tests for TTL-based caching, hit/miss tracking, and various optimization strategies
 */

import { CacheOptimizationService } from './cacheOptimizationService';

describe('CacheOptimizationService', () => {
  let cache: CacheOptimizationService<string>;

  beforeEach(() => {
    cache = new CacheOptimizationService();
  });

  describe('Basic Operations', () => {
    it('should set and retrieve cache entries', () => {
      cache.set('key1', 'value1');
      const result = cache.get('key1');

      expect(result).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should overwrite existing keys', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');

      const result = cache.get('key1');
      expect(result).toBe('value2');
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should return cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.size()).toBe(3);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL

      // Should exist immediately
      expect(cache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', async () => {
      cache.set('key1', 'value1', 500); // 500ms TTL

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still exist
      expect(cache.get('key1')).toBe('value1');
    });

    it('should use default TTL when not specified', async () => {
      cache.set('key1', 'value1'); // Uses default 3600000ms (1 hour)

      // Should exist after a short wait
      expect(cache.get('key1')).toBe('value1');
    });

    it('should clean up expired entries on set', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger cleanup by setting new entry
      cache.set('key3', 'value3');

      // Expired entries should be removed
      expect(cache.size()).toBeLessThan(3);
    });
  });

  describe('Hit/Miss Tracking', () => {
    it('should increment hit count on successful gets', () => {
      cache.set('key1', 'value1');

      cache.get('key1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(3);
    });

    it('should increment miss count on failed gets', () => {
      cache.get('non-existent');
      cache.get('another-missing');
      cache.get('key-not-here');

      const stats = cache.getStats();
      expect(stats.missCount).toBe(3);
    });

    it('should increment miss count for expired entries', async () => {
      cache.set('key1', 'value1', 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.missCount).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.get('key1'); // hit
      cache.get('key2'); // hit
      cache.get('key3'); // miss
      cache.get('key4'); // miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.5);
    });

    it('should handle hitRate with no requests', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should report cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    it('should calculate average entry age', async () => {
      cache.set('key1', 'value1');

      await new Promise((resolve) => setTimeout(resolve, 100));

      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.avgEntryAge).toBeGreaterThan(0);
    });

    it('should estimate memory usage', () => {
      cache.set('key1', 'short');
      cache.set('key2', 'a much longer value');

      const stats = cache.getStats();
      expect(stats.totalMemoryEstimate).toBeGreaterThan(0);
    });

    it('should update stats on entry access', () => {
      cache.set('key1', 'value1');

      const stats1 = cache.getStats();
      expect(stats1.size).toBe(1);

      // Access the entry to update lastAccessed
      cache.get('key1');

      const stats2 = cache.getStats();
      expect(stats2.size).toBe(1);
      expect(stats2.hitCount).toBe(1);
    });
  });

  describe('LRU Optimization', () => {
    it('should remove least recently used entries', async () => {
      cache.set('key1', 'value1');

      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.set('key2', 'value2');

      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.set('key3', 'value3');

      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.set('key4', 'value4');

      // Access key2 and key3 to update their access times
      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.get('key2');

      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.get('key3');

      // Optimize to keep only 2 entries (key2 and key3 are more recent)
      cache.optimizeByLRU(2);

      expect(cache.size()).toBe(2);
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key4')).toBeUndefined();
    });

    it('should not optimize if cache is smaller than max', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const sizeBefore = cache.size();

      cache.optimizeByLRU(10); // Max is 10, cache size is 2

      expect(cache.size()).toBe(sizeBefore);
    });

    it('should handle LRU optimization on full cache', () => {
      // Create 10 entries
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      // Access some entries to make them recent
      cache.get('key5');
      cache.get('key6');
      cache.get('key7');

      cache.optimizeByLRU(5);

      expect(cache.size()).toBe(5);
    });
  });

  describe('LFU Optimization', () => {
    it('should remove least frequently used entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');

      // Access key2 and key3 multiple times
      cache.get('key2');
      cache.get('key2');
      cache.get('key2');
      cache.get('key3');
      cache.get('key3');

      // key1 and key4 have no accesses, so they should be removed first
      cache.optimizeByLFU(2);

      expect(cache.size()).toBe(2);
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key4')).toBeUndefined();
    });

    it('should not optimize if cache is smaller than max', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const sizeBefore = cache.size();

      cache.optimizeByLFU(10); // Max is 10, cache size is 2

      expect(cache.size()).toBe(sizeBefore);
    });

    it('should handle ties in access count', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // All have same access count (0)
      cache.optimizeByLFU(1);

      expect(cache.size()).toBe(1);
    });
  });

  describe('Memory-Based Optimization', () => {
    it('should remove entries until memory limit is met', () => {
      cache.set('key1', 'a');
      cache.set('key2', 'b');
      cache.set('key3', 'very long value string that takes more memory');
      cache.set('key4', 'another entry');

      const initialStats = cache.getStats();
      const initialMemory = initialStats.totalMemoryEstimate;

      // Reduce memory to half
      cache.optimizeByMemory(Math.floor(initialMemory / 2));

      const finalStats = cache.getStats();
      expect(finalStats.totalMemoryEstimate).toBeLessThanOrEqual(
        Math.floor(initialMemory / 2)
      );
    });

    it('should remove large entries first', () => {
      cache.set('small1', 'a');
      cache.set('small2', 'b');
      cache.set('large', 'x'.repeat(1000));
      cache.set('small3', 'c');

      const statsBeforeOptimize = cache.getStats();
      const targetMemory = Math.floor(statsBeforeOptimize.totalMemoryEstimate * 0.3);

      cache.optimizeByMemory(targetMemory);

      // Large entry should be removed
      expect(cache.get('large')).toBeUndefined();
    });

    it('should not optimize if memory is already under limit', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const sizeBefore = cache.size();
      const stats = cache.getStats();

      cache.optimizeByMemory(stats.totalMemoryEstimate * 2);

      expect(cache.size()).toBe(sizeBefore);
    });
  });

  describe('Clear Operations', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.size()).toBe(3);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should reset statistics after clear', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('non-existent');

      let stats = cache.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);

      cache.clear();

      stats = cache.getStats();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed operations with TTL and optimization', async () => {
      // Set entries with different TTLs
      cache.set('persist', 'always_here', 10000);
      cache.set('short1', 'expires_soon', 100);
      cache.set('short2', 'also_expires', 100);

      // Access some entries
      cache.get('persist');
      cache.get('persist');

      // Wait for short TTLs to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Optimize
      cache.optimizeByLRU(5);

      expect(cache.get('persist')).toBe('always_here');
      expect(cache.get('short1')).toBeUndefined();
      expect(cache.get('short2')).toBeUndefined();
    });

    it('should track statistics correctly through operations', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.get('key1');
      cache.get('key1');
      cache.get('key2');
      cache.get('missing');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.hitCount).toBe(3);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.75, 2);
    });

    it('should handle large number of entries', () => {
      const entryCount = 1000;

      for (let i = 0; i < entryCount; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      expect(cache.size()).toBe(entryCount);

      // Optimize to smaller size
      cache.optimizeByLRU(100);

      expect(cache.size()).toBe(100);
    });
  });

  describe('Generic Type Support', () => {
    it('should work with different data types', () => {
      const objectCache = new CacheOptimizationService<Record<string, unknown>>();

      const obj = { name: 'test', value: 123, nested: { data: 'here' } };
      objectCache.set('obj', obj);

      const retrieved = objectCache.get('obj');
      expect(retrieved).toEqual(obj);
    });

    it('should work with arrays', () => {
      const arrayCache = new CacheOptimizationService<string[]>();

      const arr = ['a', 'b', 'c', 'd', 'e'];
      arrayCache.set('arr', arr);

      const retrieved = arrayCache.get('arr');
      expect(retrieved).toEqual(arr);
    });

    it('should work with numbers', () => {
      const numberCache = new CacheOptimizationService<number>();

      numberCache.set('num', 42);
      expect(numberCache.get('num')).toBe(42);
    });
  });

  describe('Access Count Tracking', () => {
    it('should track access count per entry', () => {
      cache.set('key1', 'value1');

      cache.get('key1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(3);
    });

    it('should increment access count on repeated get', async () => {
      cache.set('key1', 'value1');

      cache.get('key1');

      await new Promise((resolve) => setTimeout(resolve, 10));

      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(2);
    });
  });
});
