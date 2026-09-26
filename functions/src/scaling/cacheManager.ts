/**
 * Cache Manager Service
 *
 * インテリジェントキャッシング戦略
 * - LRU（Least Recently Used）キャッシュ
 * - TTL（Time To Live）管理
 * - キャッシュ統計とメモリ管理
 */

import { logger } from 'firebase-functions/v2';
import { getConfig } from '../config/productionConfig';

export interface CacheEntry<T> {
  value: T;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number;
}

export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  totalSize: number;
  memoryUsagePercent: number;
}

/**
 * LRU キャッシュ実装
 */
export class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = []; // LRU追跡用
  private hitCount: number = 0;
  private missCount: number = 0;
  private readonly maxSize: number;
  private readonly defaultTTLMs: number;

  constructor(maxSize: number = 10000, defaultTTLMs: number = 600000) {
    this.maxSize = maxSize;
    this.defaultTTLMs = defaultTTLMs;
  }

  /**
   * キャッシュに値を格納
   */
  set(key: string, value: T, ttlMs: number = this.defaultTTLMs): void {
    const config = getConfig();

    if (!config.enableCache) {
      return;
    }

    // 既存エントリを削除
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
    }

    const size = this.estimateSize(value);
    const expiresAt = new Date(Date.now() + ttlMs);

    this.cache.set(key, {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: new Date(),
      size,
    });

    this.accessOrder.push(key);
    this.evictIfNeeded();
  }

  /**
   * キャッシュから値を取得
   */
  get(key: string): T | null {
    const config = getConfig();

    if (!config.enableCache) {
      return null;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // TTL チェック
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      this.missCount++;
      return null;
    }

    // LRU 更新
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);

    this.hitCount++;
    return entry.value;
  }

  /**
   * キャッシュキーが存在するかチェック
   */
  has(key: string): boolean {
    const config = getConfig();

    if (!config.enableCache) {
      return false;
    }

    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      return false;
    }

    return true;
  }

  /**
   * キャッシュから削除
   */
  delete(key: string): boolean {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    return existed;
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * メモリ不足時にエントリを削除
   */
  private evictIfNeeded(): void {
    const totalSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );

    if (totalSize > this.maxSize && this.accessOrder.length > 0) {
      // 最も古く使われていないエントリを削除
      const keyToRemove = this.accessOrder.shift()!;
      this.cache.delete(keyToRemove);
      logger.info(`Evicted cache entry: ${keyToRemove}`);
    }
  }

  /**
   * 値のサイズを推定
   */
  private estimateSize(value: T): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    if (typeof value === 'number') {
      return 8;
    }
    if (typeof value === 'boolean') {
      return 4;
    }
    if (value === null) {
      return 0;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).length * 2;
      } catch {
        return 1024; // デフォルト推定
      }
    }
    return 128; // デフォルト
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const total = this.hitCount + this.missCount;
    const hitRate = total === 0 ? 0 : (this.hitCount / total) * 100;

    const memUsage = process.memoryUsage();
    const memoryUsagePercent =
      (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return {
      totalEntries: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      totalSize,
      memoryUsagePercent,
    };
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  cleanup(): number {
    const now = new Date();
    let removed = 0;

    const keysToRemove: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        keysToRemove.push(key);
        removed++;
      }
    }

    keysToRemove.forEach((key) => {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
    });

    if (removed > 0) {
      logger.info(`Cleaned up ${removed} expired cache entries`);
    }

    return removed;
  }

  /**
   * キャッシュサイズを取得
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * 全キャッシュサイズを取得（バイト）
   */
  getTotalSize(): number {
    return Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );
  }
}

/**
 * グローバルキャッシュインスタンス
 */
export const globalCacheManager = new CacheManager<any>(
  10000,
  600000
);
