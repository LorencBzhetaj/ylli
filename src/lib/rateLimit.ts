/**
 * Fixed-window limiter for login attempts.
 *   - memory: local preview / single instance (default)
 *   - redis:  Upstash Redis REST (UPSTASH_REDIS_REST_URL + _TOKEN, or Vercel's KV_REST_API_URL + _TOKEN),
 *             shared by every serverless instance — required in production (see docs/DEPLOY.md).
 */
export type HitResult = { allowed: boolean; remaining: number; retryAfterMs: number }

export interface Limiter {
  hit(key: string, now?: number): Promise<HitResult>
  reset(key: string): Promise<void>
}

export class RateLimiter implements Limiter {
  private buckets = new Map<string, { count: number; resetAt: number }>()
  constructor(private readonly max: number, private readonly windowMs: number) {}

  async hit(key: string, now = Date.now()): Promise<HitResult> {
    let b = this.buckets.get(key)
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + this.windowMs }
      this.buckets.set(key, b)
    }
    b.count++
    if (this.buckets.size > 10_000) for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k)
    const allowed = b.count <= this.max
    return { allowed, remaining: Math.max(0, this.max - b.count), retryAfterMs: allowed ? 0 : b.resetAt - now }
  }

  async reset(key: string) {
    this.buckets.delete(key)
  }
}

export class RedisRateLimiter implements Limiter {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly name: string,
    private readonly max: number,
    private readonly windowMs: number,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async pipeline(cmds: (string | number)[][]): Promise<{ result?: unknown; error?: string }[]> {
    const r = await this.fetchImpl(`${this.url.replace(/\/+$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
      cache: 'no-store',
    })
    if (!r.ok) throw new Error(`ratelimit store ${r.status}`)
    return r.json()
  }

  async hit(key: string): Promise<HitResult> {
    const k = `nadia:rl:${this.name}:${key}`
    // INCR then make sure the key expires (PEXPIRE ... NX keeps the first window's expiry).
    const [incr, , ttl] = await this.pipeline([['INCR', k], ['PEXPIRE', k, this.windowMs, 'NX'], ['PTTL', k]])
    const count = Number(incr.result)
    const pttl = Math.max(0, Number(ttl.result))
    const allowed = count <= this.max
    return { allowed, remaining: Math.max(0, this.max - count), retryAfterMs: allowed ? 0 : pttl }
  }

  async reset(key: string) {
    await this.pipeline([['DEL', `nadia:rl:${this.name}:${key}`]])
  }
}

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  return url && token ? { url, token } : null
}

export function rateLimitBackend(): 'redis' | 'memory' {
  return redisEnv() ? 'redis' : 'memory'
}

function make(name: string, max: number, windowMs: number): Limiter {
  const env = redisEnv()
  return env ? new RedisRateLimiter(env.url, env.token, name, max, windowMs) : new RateLimiter(max, windowMs)
}

// 5 attempts per IP per 15 minutes, plus a global ceiling against distributed guessing.
export const loginLimiter = make('ip', 5, 15 * 60_000)
export const globalLoginLimiter = make('global', 100, 15 * 60_000)
