import { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitConfig {
  windowMs: number; // Time window in ms
  max: number; // Max requests per window
  message?: string;
  keyPrefix?: string;
}

interface RecordEntry {
  count: number;
  firstAccess: number;
  blockedUntil: number;
  attempts: number;
}

// In-memory store for rate limiting (Thread-safe within Node process lifecycle)
const rateLimitStore = new Map<string, RecordEntry>();

// Clean up stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now - record.firstAccess > 3600000 && now > record.blockedUntil) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
}

/**
 * Get client IP from request headers or socket
 */
export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips.trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp && !Array.isArray(realIp)) {
    return realIp.trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Rate Limiter Middleware
 * Supports Exponential Backoff for repeated violations
 */
export function rateLimit(config: RateLimitConfig) {
  const windowMs = config.windowMs;
  const max = config.max;
  const keyPrefix = config.keyPrefix || 'rl';

  return async (req: NextApiRequest, res: NextApiResponse, identifier?: string): Promise<boolean> => {
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${identifier ? `${ip}:${identifier}` : ip}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record) {
      record = {
        count: 1,
        firstAccess: now,
        blockedUntil: 0,
        attempts: 1,
      };
      rateLimitStore.set(key, record);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return true;
    }

    // Check if client is currently blocked due to previous threshold breaches
    if (now < record.blockedUntil) {
      const retryAfterSec = Math.ceil((record.blockedUntil - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.status(429).json({
        error: config.message || 'Too many requests. Please try again later.',
        retryAfterSeconds: retryAfterSec,
      });
      return false;
    }

    // Reset window if expired
    if (now - record.firstAccess > windowMs) {
      record.count = 1;
      record.firstAccess = now;
      rateLimitStore.set(key, record);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return true;
    }

    // Increment count
    record.count += 1;

    if (record.count > max) {
      // Exponential Backoff calculation: base 10s * 2^(attempts-1), max 1 hour
      record.attempts += 1;
      const backoffMs = Math.min(10000 * Math.pow(2, record.attempts - 1), 3600000);
      record.blockedUntil = now + backoffMs;
      rateLimitStore.set(key, record);

      const retryAfterSec = Math.ceil(backoffMs / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);

      res.status(429).json({
        error: config.message || 'Too many requests. Rate limit exceeded.',
        retryAfterSeconds: retryAfterSec,
      });
      return false;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    return true;
  };
}

// Configurable presets with ENV fallbacks
export const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '600000', 10), // 10 min
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10), // 10 attempts
  keyPrefix: 'rl:auth',
  message: 'Too many login/auth attempts. Please wait a few minutes before trying again.',
});

export const apiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000', 10), // 1 min
  max: parseInt(process.env.RATE_LIMIT_API_MAX || '100', 10), // 100 requests per minute
  keyPrefix: 'rl:api',
  message: 'API rate limit exceeded. Please slow down your requests.',
});

export const strictApiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_STRICT_WINDOW_MS || '60000', 10), // 1 min
  max: parseInt(process.env.RATE_LIMIT_STRICT_MAX || '30', 10), // 30 requests per minute
  keyPrefix: 'rl:strict',
  message: 'Resource rate limit exceeded. Please wait a moment.',
});
