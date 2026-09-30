/**
 * Cache Manager Tests
 *
 * LRU キャッシュ、TTL 管理、キャッシュ統計のテスト
 */

import { CacheManager } from './cacheManager';
import { updateConfig, resetConfig } from '../config/productionConfig';

describe('CacheManager', () => {
  let cache: CacheManager<string | number | object>;

  beforeEach(() => {
    cache = new CacheManager<string | number | object>(10000, 600000);
    resetConfig();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      const value = cache.get('key1');

      expect(value).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      const value = cache.get('non-existent');
      expect(value).toBeNull();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      const deleted = cache.delete('key1');

      expect(deleted).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      expect(cache.getSize()).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL Management', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL

      expect(cache.get('key1')).toBe('value1');

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.get('key1')).toBeNull();
    });

    it('should use default TTL', async () => {
      const shortCache = new CacheManager<string>(10000, 100);
      shortCache.set('key1', 'value1');

      expect(shortCache.get('key1')).toBe('value1');

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(shortCache.get('key1')).toBeNull();
    });

    it('should support custom TTL per entry', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 500);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entries', () => {
      const smallCache = new CacheManager<string>(100, 600000); // 100 bytes max
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');

      // Access key1 to make it more recently used
      smallCache.get('key1');

      // Add a large value that should evict key2 (least recently used)
      smallCache.set('key3', 'a'.repeat(50));

      // key1 should still be there (recently used)
      expect(smallCache.has('key1')).toBe(true);
    });

    it('should track access order', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.get('key1');
      cache.get('key1');
      cache.get('key2');

      // key1 was accessed most recently through the second get('key2')
      // After that, key1 should be less recently used
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);
    });
  });

  describe('Configuration Integration', () => {
    it('should respect cache enable setting', () => {
      updateConfig({ enableCache: false });

      cache.set('key1', 'value1');
      const value = cache.get('key1');

      // When caching is disabled, get should return null
      expect(value).toBeNull();
    });

    it('should work when cache is enabled', () => {
      updateConfig({ enableCache: true });

      cache.set('key1', 'value1');
      const value = cache.get('key1');

      expect(value).toBe('value1');
    });
  });

  describe('Statistics', () => {
    it('should track hit count', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.hitCount).toBeGreaterThan(0);
    });

    it('should track miss count', () => {
      cache.get('non-existent');
      cache.get('non-existent');

      const stats = cache.getStats();
      expect(stats.missCount).toBeGreaterThan(0);
    });

    it('should calculate hit rate', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('non-existent'); // miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThanOrEqual(100);
    });

    it('should provide cache stats', () => {
      cache.set('key1', 'value1');
      const stats = cache.getStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('hitCount');
      expect(stats).toHaveProperty('missCount');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('memoryUsagePercent');
    });

    it('should track total size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should report memory usage', () => {
      cache.set('key1', 'value1');
      const stats = cache.getStats();

      expect(stats.memoryUsagePercent).toBeGreaterThan(0);
      expect(stats.memoryUsagePercent).toBeLessThanOrEqual(100);
    });
  });

  describe('Cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 5000);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const removed = cache.cleanup();
      expect(removed).toBeGreaterThan(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });

    it('should return count of removed entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value1', 50);
      cache.set('key3', 'value3', 5000);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const removed = cache.cleanup();
      expect(removed).toBe(2);
    });

    it('should handle cleanup with no expired entries', () => {
      cache.set('key1', 'value1');
      const removed = cache.cleanup();

      expect(removed).toBe(0);
    });
  });

  describe('Size Management', () => {
    it('should track cache size (entry count)', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.getSize()).toBe(2);
    });

    it('should track total size in bytes', () => {
      cache.set('key1', 'value1');
      const totalSize = cache.getTotalSize();

      expect(totalSize).toBeGreaterThan(0);
    });

    it('should decrease size on deletion', () => {
      cache.set('key1', 'value1');
      const sizeAfterAdd = cache.getSize();

      cache.delete('key1');
      const sizeAfterDelete = cache.getSize();

      expect(sizeAfterDelete).toBeLessThan(sizeAfterAdd);
    });
  });

  describe('Data Type Support', () => {
    it('should cache strings', () => {
      const strCache = new CacheManager<string>(10000, 600000);
      strCache.set('key1', 'string value');

      expect(strCache.get('key1')).toBe('string value');
    });

    it('should cache numbers', () => {
      const numCache = new CacheManager<number>(10000, 600000);
      numCache.set('key1', 42);

      expect(numCache.get('key1')).toBe(42);
    });

    it('should cache objects', () => {
      const objCache = new CacheManager<object>(10000, 600000);
      const obj = { a: 1, b: 2 };
      objCache.set('key1', obj);

      expect(objCache.get('key1')).toEqual(obj);
    });

    it('should cache arrays', () => {
      const arrCache = new CacheManager<string[]>(10000, 600000);
      const arr = ['a', 'b', 'c'];
      arrCache.set('key1', arr);

      expect(arrCache.get('key1')).toEqual(arr);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty key', () => {
      cache.set('', 'value');
      expect(cache.get('')).toBe('value');
    });

    it('should handle null values', () => {
      const nullCache = new CacheManager<any>(10000, 600000);
      nullCache.set('key1', null);

      // null is a valid cached value, but get() returns null for both
      // non-existent and expired keys, so we check with has()
      expect(nullCache.has('key1')).toBe(true);
    });

    it('should handle very large values', () => {
      const largeCache = new CacheManager<string>(100000, 600000);
      const largeStr = 'x'.repeat(10000);
      largeCache.set('key1', largeStr);

      expect(largeCache.get('key1')).toBe(largeStr);
    });

    it('should handle rapid access', () => {
      cache.set('key1', 'value1');

      for (let i = 0; i < 1000; i++) {
        cache.get('key1');
      }

      const stats = cache.getStats();
      expect(stats.hitCount).toBeGreaterThan(0);
    });
  });

  describe('Multiple Instances', () => {
    it('should maintain separate caches', () => {
      const cache1 = new CacheManager<string>(10000, 600000);
      const cache2 = new CacheManager<string>(10000, 600000);

      cache1.set('key1', 'value1');
      cache2.set('key1', 'value2');

      expect(cache1.get('key1')).toBe('value1');
      expect(cache2.get('key1')).toBe('value2');
    });

    it('should have independent statistics', () => {
      const cache1 = new CacheManager<string>(10000, 600000);
      const cache2 = new CacheManager<string>(10000, 600000);

      cache1.set('key1', 'value1');
      cache1.get('key1');

      const stats1 = cache1.getStats();
      const stats2 = cache2.getStats();

      expect(stats1.hitCount).toBeGreaterThan(0);
      expect(stats2.hitCount).toBe(0);
    });
  });
});
