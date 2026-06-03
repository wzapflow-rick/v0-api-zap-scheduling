// Rate Limiter - In-memory store for serverless
// For production, consider using Upstash Redis

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets on cold start, but good for burst protection)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  // If no entry or window expired, create new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

// Pre-configured rate limiters
export const RATE_LIMITS = {
  // Messages: 30 per minute per establishment
  messages: { maxRequests: 30, windowMs: 60 * 1000 },
  // QR Code: 10 per minute
  qrcode: { maxRequests: 10, windowMs: 60 * 1000 },
  // Instance operations: 5 per minute
  instance: { maxRequests: 5, windowMs: 60 * 1000 },
  // General API: 100 per minute
  general: { maxRequests: 100, windowMs: 60 * 1000 },
};
