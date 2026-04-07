/**
 * In-memory rate limiter utility.
 *
 * Replaces the duplicated Map + setInterval pattern found across
 * multiple route files.  Each call to `createRateLimitMap` returns
 * an independent limiter with its own Map and cleanup timer.
 *
 * Note: state resets on serverless cold start.  For persistent
 * rate limiting use Upstash Redis via rateLimitMiddleware.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Maximum requests allowed within the window. */
  maxRequests: number;
  /** Time window in milliseconds. */
  windowMs: number;
  /** How often to purge expired entries (default: 60 000 ms). */
  cleanupIntervalMs?: number;
}

interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
}

export function createRateLimitMap(options: RateLimitOptions) {
  const { maxRequests, windowMs, cleanupIntervalMs = 60_000 } = options;
  const map = new Map<string, RateLimitEntry>();

  // Periodic cleanup to prevent unbounded memory growth.
  if (typeof globalThis !== 'undefined') {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of map) {
        if (entry.resetAt <= now) {
          map.delete(key);
        }
      }
    }, cleanupIntervalMs);
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = map.get(key);

    if (!entry || entry.resetAt <= now) {
      map.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: maxRequests - entry.count };
  }

  return { check };
}
