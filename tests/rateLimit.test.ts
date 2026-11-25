import { describe, expect, it } from 'vitest'
import { RateLimiter, RedisRateLimiter } from '@/lib/rateLimit'

describe('RateLimiter (memory)', () => {
  it('blocks after max attempts and resets after the window', async () => {
    const rl = new RateLimiter(3, 1000)
    const t0 = 1_000_000
    expect((await rl.hit('ip', t0)).allowed).toBe(true)
    expect((await rl.hit('ip', t0)).allowed).toBe(true)
    expect((await rl.hit('ip', t0)).allowed).toBe(true)
    const blocked = await rl.hit('ip', t0 + 10)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBe(990)
    expect((await rl.hit('other', t0)).allowed).toBe(true)
    expect((await rl.hit('ip', t0 + 1001)).allowed).toBe(true)
  })

  it('reset clears a key', async () => {
    const rl = new RateLimiter(1, 1000)
    await rl.hit('ip', 0)
    expect((await rl.hit('ip', 0)).allowed).toBe(false)
    await rl.reset('ip')
    expect((await rl.hit('ip', 0)).allowed).toBe(true)
  })
})

describe('RedisRateLimiter (Upstash REST, shared across serverless instances)', () => {
  function fakeRedis() {
    const db = new Map<string, { n: number; exp: number | null }>()
    const bodies: unknown[] = []
    const impl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok')
      const cmds = JSON.parse(String(init?.body)) as (string | number)[][]
      bodies.push(cmds)
      const out = cmds.map(([op, key, arg]) => {
        const k = String(key)
        const v = db.get(k)
        if (op === 'INCR') {
          const n = (v?.n ?? 0) + 1
          db.set(k, { n, exp: v?.exp ?? null })
          return { result: n }
        }
        if (op === 'PEXPIRE') {
          if (v && v.exp === null) v.exp = Number(arg)
          return { result: 1 }
        }
        if (op === 'PTTL') return { result: v?.exp ?? -2 }
        if (op === 'DEL') return { result: db.delete(k) ? 1 : 0 }
        return { error: 'unknown' }
      })
      return new Response(JSON.stringify(out))
    }) as typeof fetch
    return { impl, bodies }
  }

  it('counts in Redis, blocks after max, reports retry time, and resets', async () => {
    const { impl, bodies } = fakeRedis()
    const rl = new RedisRateLimiter('https://x.upstash.io/', 'tok', 'ip', 2, 900_000, impl)
    expect((await rl.hit('1.2.3.4')).allowed).toBe(true)
    expect((await rl.hit('1.2.3.4')).allowed).toBe(true)
    const third = await rl.hit('1.2.3.4')
    expect(third).toEqual({ allowed: false, remaining: 0, retryAfterMs: 900_000 })
    expect(bodies[0]).toEqual([['INCR', 'nadia:rl:ip:1.2.3.4'], ['PEXPIRE', 'nadia:rl:ip:1.2.3.4', 900_000, 'NX'], ['PTTL', 'nadia:rl:ip:1.2.3.4']])
    await rl.reset('1.2.3.4')
    expect((await rl.hit('1.2.3.4')).allowed).toBe(true)
  })

  it('throws when the store is unreachable (the login route then fails closed)', async () => {
    const rl = new RedisRateLimiter('https://x', 'tok', 'ip', 2, 1000, (async () => new Response('', { status: 500 })) as typeof fetch)
    await expect(rl.hit('a')).rejects.toThrow()
  })
})
