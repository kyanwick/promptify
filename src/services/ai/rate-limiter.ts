/**
 * Rate Limiter for AI Provider Usage
 * Tracks usage and enforces limits per user/session
 */

import { ProviderRateLimitConfig, RateLimitStatus } from './types';

export interface UserRateLimit {
  userId: string;
  requestsPerMinute: Map<number, number>; // minute timestamp -> count
  requestsPerHour: Map<number, number>; // hour timestamp -> count
  requestsPerDay: Map<number, number>; // day timestamp -> count
  tokensPerMinute: Map<number, number>;
  tokensPerHour: Map<number, number>;
  tokensPerDay: Map<number, number>;
  lastResetTime: number;
}

export class RateLimiter {
  private limits: ProviderRateLimitConfig;
  private userLimits: Map<string, UserRateLimit> = new Map();
  private cleanupIntervalId: NodeJS.Timeout;

  constructor(limits: ProviderRateLimitConfig = {}) {
    this.limits = {
      requestsPerMinute: limits.requestsPerMinute ?? 20,
      requestsPerHour: limits.requestsPerHour ?? 200,
      requestsPerDay: limits.requestsPerDay ?? 1000,
      tokensPerMinute: limits.tokensPerMinute ?? 40000,
      tokensPerHour: limits.tokensPerHour ?? 200000,
      tokensPerDay: limits.tokensPerDay ?? 2000000,
    };

    // Cleanup old entries every 5 minutes
    this.cleanupIntervalId = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  checkLimit(userId: string): RateLimitStatus {
    const now = Date.now();
    const userLimit = this.getUserLimit(userId);

    // Check requests per minute
    const minuteKey = Math.floor(now / 60000);
    const minReqs = this.getCount(userLimit.requestsPerMinute, minuteKey);
    if (minReqs >= (this.limits.requestsPerMinute ?? 20)) {
      return {
        isLimited: true,
        nextAvailableIn: 60000 - (now % 60000),
      };
    }

    // Check requests per hour
    const hourKey = Math.floor(now / 3600000);
    const hourReqs = this.getCount(userLimit.requestsPerHour, hourKey);
    if (hourReqs >= (this.limits.requestsPerHour ?? 200)) {
      return {
        isLimited: true,
        nextAvailableIn: 3600000 - (now % 3600000),
      };
    }

    // Check requests per day
    const dayKey = Math.floor(now / 86400000);
    const dayReqs = this.getCount(userLimit.requestsPerDay, dayKey);
    if (dayReqs >= (this.limits.requestsPerDay ?? 1000)) {
      return {
        isLimited: true,
        nextAvailableIn: 86400000 - (now % 86400000),
      };
    }

    return {
      isLimited: false,
      remaining: {
        requestsThisMinute: (this.limits.requestsPerMinute ?? 20) - minReqs,
        requestsThisHour: (this.limits.requestsPerHour ?? 200) - hourReqs,
        requestsThisDay: (this.limits.requestsPerDay ?? 1000) - dayReqs,
      },
    };
  }

  recordRequest(userId: string, tokenCount: number = 0): void {
    const now = Date.now();
    const userLimit = this.getUserLimit(userId);

    // Record request
    const minuteKey = Math.floor(now / 60000);
    const hourKey = Math.floor(now / 3600000);
    const dayKey = Math.floor(now / 86400000);

    this.incrementCount(userLimit.requestsPerMinute, minuteKey);
    this.incrementCount(userLimit.requestsPerHour, hourKey);
    this.incrementCount(userLimit.requestsPerDay, dayKey);

    // Record tokens
    if (tokenCount > 0) {
      this.incrementCount(userLimit.tokensPerMinute, minuteKey, tokenCount);
      this.incrementCount(userLimit.tokensPerHour, hourKey, tokenCount);
      this.incrementCount(userLimit.tokensPerDay, dayKey, tokenCount);
    }

    userLimit.lastResetTime = now;
  }

  getRemainingUsage(userId: string) {
    const now = Date.now();
    const userLimit = this.getUserLimit(userId);

    const minuteKey = Math.floor(now / 60000);
    const hourKey = Math.floor(now / 3600000);
    const dayKey = Math.floor(now / 86400000);

    return {
      requestsPerMinute: {
        used: this.getCount(userLimit.requestsPerMinute, minuteKey),
        limit: this.limits.requestsPerMinute ?? 20,
      },
      requestsPerHour: {
        used: this.getCount(userLimit.requestsPerHour, hourKey),
        limit: this.limits.requestsPerHour ?? 200,
      },
      requestsPerDay: {
        used: this.getCount(userLimit.requestsPerDay, dayKey),
        limit: this.limits.requestsPerDay ?? 1000,
      },
      tokensPerMinute: {
        used: this.getCount(userLimit.tokensPerMinute, minuteKey),
        limit: this.limits.tokensPerMinute ?? 40000,
      },
      tokensPerHour: {
        used: this.getCount(userLimit.tokensPerHour, hourKey),
        limit: this.limits.tokensPerHour ?? 200000,
      },
      tokensPerDay: {
        used: this.getCount(userLimit.tokensPerDay, dayKey),
        limit: this.limits.tokensPerDay ?? 2000000,
      },
    };
  }

  private getUserLimit(userId: string): UserRateLimit {
    if (!this.userLimits.has(userId)) {
      this.userLimits.set(userId, {
        userId,
        requestsPerMinute: new Map(),
        requestsPerHour: new Map(),
        requestsPerDay: new Map(),
        tokensPerMinute: new Map(),
        tokensPerHour: new Map(),
        tokensPerDay: new Map(),
        lastResetTime: Date.now(),
      });
    }
    return this.userLimits.get(userId)!;
  }

  private getCount(map: Map<number, number>, key: number): number {
    return map.get(key) || 0;
  }

  private incrementCount(map: Map<number, number>, key: number, amount: number = 1): void {
    map.set(key, (map.get(key) || 0) + amount);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [userId, userLimit] of this.userLimits.entries()) {
      // Clean old minute entries (keep last 10 minutes)
      for (const key of userLimit.requestsPerMinute.keys()) {
        if (now - key * 60000 > 10 * 60000) {
          userLimit.requestsPerMinute.delete(key);
        }
      }

      // Clean old hour entries (keep last 48 hours)
      for (const key of userLimit.requestsPerHour.keys()) {
        if (now - key * 3600000 > 48 * 3600000) {
          userLimit.requestsPerHour.delete(key);
        }
      }

      // Clean old day entries (keep last 90 days)
      for (const key of userLimit.requestsPerDay.keys()) {
        if (now - key * 86400000 > 90 * 86400000) {
          userLimit.requestsPerDay.delete(key);
        }
      }

      // Remove user if no activity in 24 hours
      if (now - userLimit.lastResetTime > 24 * 3600000) {
        this.userLimits.delete(userId);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupIntervalId);
  }
}
