/**
 * Rate Limiter Service
 *
 * リクエスト制限、スロットリング、トークンバケット
 * - ユーザー単位のレート制限
 * - グローバルレート制限
 * - 適応的なスロットリング
 */

import { logger } from 'firebase-functions/v2';
import { getConfig } from '../config/productionConfig';

export interface RateLimitConfig {
  windowMs: number; // ウィンドウサイズ（ミリ秒）
  maxRequests: number; // ウィンドウ内の最大リクエスト数
  keyPrefix: string; // キープレフィックス
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfterMs: number;
  currentUsage: number;
}

/**
 * トークンバケットベースのレート制限
 */
class TokenBucket {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillRate: number; // トークン/ミリ秒
  private lastRefillTime: number;

  constructor(capacity: number, refillRatePerSecond: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRatePerSecond / 1000; // ミリ秒への変換
    this.lastRefillTime = Date.now();
  }

  /**
   * トークンを消費できるかチェック
   */
  tryConsume(tokensNeeded: number = 1): boolean {
    this.refillTokens();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return true;
    }
    return false;
  }

  /**
   * トークンを再充填
   */
  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * 残りトークン数を取得
   */
  getAvailableTokens(): number {
    this.refillTokens();
    return this.tokens;
  }

  /**
   * 次のトークン利用可能までの待機時間（ミリ秒）
   */
  getWaitTimeMs(): number {
    this.refillTokens();
    if (this.tokens >= 1) {
      return 0;
    }
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }
}

/**
 * スライディングウィンドウレート制限
 */
class SlidingWindowLimiter {
  private requests: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * リクエストを許可するかチェック
   */
  isAllowed(): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    // ウィンドウ外のリクエストを削除
    this.requests = this.requests.filter((time) => time > cutoff);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }

  /**
   * 現在のリクエスト数を取得
   */
  getCurrentCount(): number {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    return this.requests.filter((time) => time > cutoff).length;
  }

  /**
   * 次のリクエスト可能時刻を取得
   */
  getResetTime(): Date {
    if (this.requests.length === 0) {
      return new Date();
    }
    const oldestRequest = this.requests[0];
    return new Date(oldestRequest + this.windowMs);
  }
}

/**
 * レート制限マネージャー
 */
export class RateLimiter {
  private userBuckets: Map<string, TokenBucket> = new Map();
  private globalBucket: TokenBucket | null = null;
  private slidingWindows: Map<string, SlidingWindowLimiter> = new Map();
  private deniedCount: number = 0;

  /**
   * ユーザーのリクエストを許可するかチェック（トークンバケット）
   */
  isUserAllowed(userId: string): RateLimitStatus {
    const config = getConfig();
    const rateLimitPerMinute = config.rateLimitPerMinute;
    const refillRatePerSecond = rateLimitPerMinute / 60;

    // ユーザーのバケットを取得または作成
    if (!this.userBuckets.has(userId)) {
      this.userBuckets.set(
        userId,
        new TokenBucket(config.burstLimit, refillRatePerSecond)
      );
    }

    const bucket = this.userBuckets.get(userId)!;
    const allowed = bucket.tryConsume();

    if (!allowed) {
      this.deniedCount++;
      logger.warn(`Rate limit exceeded for user ${userId}`);
    }

    const remaining = Math.floor(bucket.getAvailableTokens());
    const waitTimeMs = bucket.getWaitTimeMs();
    const resetTime = new Date(Date.now() + waitTimeMs);

    return {
      allowed,
      remaining: Math.max(0, remaining),
      resetTime,
      retryAfterMs: waitTimeMs,
      currentUsage: config.burstLimit - remaining,
    };
  }

  /**
   * グローバルレート制限をチェック（スライディングウィンドウ）
   */
  isGlobalAllowed(): boolean {
    const config = getConfig();

    if (!this.globalBucket) {
      this.globalBucket = new TokenBucket(
        config.rateLimitPerHour / 60,
        config.rateLimitPerHour / 3600000
      );
    }

    return this.globalBucket.tryConsume();
  }

  /**
   * バーストリクエストを許可するかチェック
   */
  canBurst(userId: string, count: number = 1): boolean {
    const key = `burst:${userId}`;

    if (!this.slidingWindows.has(key)) {
      const config = getConfig();
      this.slidingWindows.set(
        key,
        new SlidingWindowLimiter(1000, config.burstLimit) // 1秒単位
      );
    }

    const window = this.slidingWindows.get(key)!;
    let allowed = true;

    for (let i = 0; i < count; i++) {
      if (!window.isAllowed()) {
        allowed = false;
        this.deniedCount++;
        break;
      }
    }

    return allowed;
  }

  /**
   * レート制限をリセット（テスト用）
   */
  reset(): void {
    this.userBuckets.clear();
    this.globalBucket = null;
    this.slidingWindows.clear();
    this.deniedCount = 0;
  }

  /**
   * ユーザーの制限をリセット
   */
  resetUser(userId: string): void {
    this.userBuckets.delete(userId);
  }

  /**
   * 拒否されたリクエスト数を取得
   */
  getDeniedCount(): number {
    return this.deniedCount;
  }

  /**
   * ユーザー別の統計を取得
   */
  getUserStats(userId: string): {
    tokensAvailable: number;
    waitTimeMs: number;
    resetTime: Date;
  } | null {
    const bucket = this.userBuckets.get(userId);
    if (!bucket) {
      return null;
    }

    return {
      tokensAvailable: Math.floor(bucket.getAvailableTokens()),
      waitTimeMs: bucket.getWaitTimeMs(),
      resetTime: new Date(Date.now() + bucket.getWaitTimeMs()),
    };
  }

  /**
   * アクティブなユーザー数を取得
   */
  getActiveUsers(): number {
    return this.userBuckets.size;
  }
}

/**
 * グローバルレート制限インスタンス
 */
export const globalRateLimiter = new RateLimiter();
