/**
 * Small fixed-window limiter for login attempts.
 * NOTE: in-memory — fine for local preview and a single server instance.
 * For serverless production (M5) back this with a shared store (e.g. Upstash/Vercel KV).
 */
type Bucket = { count: number; resetAt: number }

export class RateLimiter {
  private buckets = new Map<string, Bucket>()
  constructor(private readonly max: number, private readonly windowMs: number) {}

  /** Returns remaining attempts, or -1 with retryAfterMs when blocked. */
  hit(key: string, now = Date.now()): { allowed: boolean; remaining: number; retryAfterMs: number } {
    let b = this.buckets.get(key)
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + this.windowMs }
      this.buckets.set(key, b)
    }
    b.count++
    if (this.buckets.size > 10_000) this.sweep(now)
    const allowed = b.count <= this.max
    return { allowed, remaining: Math.max(0, this.max - b.count), retryAfterMs: allowed ? 0 : b.resetAt - now }
  }

  reset(key: string) {
    this.buckets.delete(key)
  }

  private sweep(now: number) {
    for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k)
  }
}

// 5 attempts per IP per 15 minutes, plus a global ceiling against distributed guessing.
export const loginLimiter = new RateLimiter(5, 15 * 60_000)
export const globalLoginLimiter = new RateLimiter(100, 15 * 60_000)
