/**
 * Cache Optimization Service
 *
 * キャッシング戦略の最適化と管理
 * - TTL管理
 * - キャッシュヒット率分析
 * - メモリ効率化
 */

import { logger } from 'firebase-functions/v2';

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: Date;
  ttlMs: number;
  accessCount: number;
  lastAccessed: Date;
}

export interface CacheStats {
  size: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  avgEntryAge: number;
  totalMemoryEstimate: number;
}

export class CacheOptimizationService<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private hitCount = 0;
  private missCount = 0;

  /**
   * キャッシュにエントリを設定
   */
  set(key: string, value: T, ttlMs: number = 3600000): void {
    const now = new Date();

    this.cache.set(key, {
      key,
      value,
      timestamp: now,
      ttlMs,
      accessCount: 0,
      lastAccessed: now,
    });

    // Clean up expired entries
    this.cleanupExpired();
  }

  /**
   * キャッシュからエントリを取得
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return undefined;
    }

    // Check if entry is expired
    const now = new Date();
    const age = now.getTime() - entry.timestamp.getTime();

    if (age > entry.ttlMs) {
      this.cache.delete(key);
      this.missCount++;
      return undefined;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = now;
    this.hitCount++;

    return entry.value;
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  private cleanupExpired(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      const age = now.getTime() - entry.timestamp.getTime();
      if (age > entry.ttlMs) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      logger.info(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = new Date();

    let totalAge = 0;
    let totalMemory = 0;

    entries.forEach((entry) => {
      const age = now.getTime() - entry.timestamp.getTime();
      totalAge += age;
      // Rough memory estimate: key + JSON string of value
      totalMemory += entry.key.length + JSON.stringify(entry.value).length;
    });

    const totalRequests = this.hitCount + this.missCount;

    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      avgEntryAge: entries.length > 0 ? totalAge / entries.length : 0,
      totalMemoryEstimate: totalMemory,
    };
  }

  /**
   * LRU (Least Recently Used) キャッシュを最適化
   */
  optimizeByLRU(maxEntries: number): void {
    if (this.cache.size <= maxEntries) {
      return;
    }

    const entries = Array.from(this.cache.values());
    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    // Remove oldest entries
    const toRemove = entries.length - maxEntries;
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i].key);
    }

    logger.info(`LRU optimization: removed ${toRemove} entries, cache size now ${this.cache.size}`);
  }

  /**
   * LFU (Least Frequently Used) キャッシュを最適化
   */
  optimizeByLFU(maxEntries: number): void {
    if (this.cache.size <= maxEntries) {
      return;
    }

    const entries = Array.from(this.cache.values());
    // Sort by access count (least accessed first)
    entries.sort((a, b) => a.accessCount - b.accessCount);

    // Remove least accessed entries
    const toRemove = entries.length - maxEntries;
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i].key);
    }

    logger.info(`LFU optimization: removed ${toRemove} entries, cache size now ${this.cache.size}`);
  }

  /**
   * メモリ使用量に基づいて最適化
   */
  optimizeByMemory(maxMemoryBytes: number): void {
    let totalMemory = 0;
    const entries = Array.from(this.cache.values());

    // Calculate current memory usage
    entries.forEach((entry) => {
      totalMemory += entry.key.length + JSON.stringify(entry.value).length;
    });

    if (totalMemory <= maxMemoryBytes) {
      return;
    }

    // Sort by memory usage (largest first) and remove
    entries.sort((a, b) => {
      const sizeA = a.key.length + JSON.stringify(a.value).length;
      const sizeB = b.key.length + JSON.stringify(b.value).length;
      return sizeB - sizeA;
    });

    let currentMemory = totalMemory;
    let removed = 0;

    for (const entry of entries) {
      if (currentMemory <= maxMemoryBytes) break;

      const entrySize = entry.key.length + JSON.stringify(entry.value).length;
      this.cache.delete(entry.key);
      currentMemory -= entrySize;
      removed++;
    }

    logger.info(
      `Memory optimization: removed ${removed} entries, ` +
      `memory reduced from ${totalMemory} to ${currentMemory} bytes`
    );
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * キャッシュキーが存在するか確認
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * キャッシュサイズを取得
   */
  size(): number {
    return this.cache.size;
  }
}

// 汎用キャッシュインスタンス
export const modelMetadataCache = new CacheOptimizationService<Record<string, unknown>>();
export const categoryClassificationCache = new CacheOptimizationService<string>();
export const userPreferencesCache = new CacheOptimizationService<Record<string, unknown>>();
