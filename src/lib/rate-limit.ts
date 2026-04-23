// Simple in-memory rate limiter (upgrade to Redis for production multi-instance)

interface RateLimitEntry { count: number; resetTime: number }
const store = new Map<string, RateLimitEntry>()

export interface RateLimitResult { success: boolean; limit: number; remaining: number; reset: number }

export function rateLimit(key: string, maxRequests: number, windowSeconds: number): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = { count: 1, resetTime: now + windowMs }
    store.set(key, newEntry)
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, reset: newEntry.resetTime }
  }

  if (entry.count >= maxRequests) {
    return { success: false, limit: maxRequests, remaining: 0, reset: entry.resetTime }
  }

  entry.count++
  return { success: true, limit: maxRequests, remaining: maxRequests - entry.count, reset: entry.resetTime }
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) store.delete(key)
  }
}, 300000)
