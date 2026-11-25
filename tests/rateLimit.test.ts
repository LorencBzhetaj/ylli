import { describe, expect, it } from 'vitest'
import { RateLimiter } from '@/lib/rateLimit'

describe('RateLimiter', () => {
  it('blocks after max attempts and resets after the window', () => {
    const rl = new RateLimiter(3, 1000)
    const t0 = 1_000_000
    expect(rl.hit('ip', t0).allowed).toBe(true)
    expect(rl.hit('ip', t0).allowed).toBe(true)
    expect(rl.hit('ip', t0).allowed).toBe(true)
    const blocked = rl.hit('ip', t0 + 10)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBe(990)
    expect(rl.hit('other', t0).allowed).toBe(true)
    expect(rl.hit('ip', t0 + 1001).allowed).toBe(true)
  })

  it('reset clears a key', () => {
    const rl = new RateLimiter(1, 1000)
    rl.hit('ip', 0)
    expect(rl.hit('ip', 0).allowed).toBe(false)
    rl.reset('ip')
    expect(rl.hit('ip', 0).allowed).toBe(true)
  })
})
