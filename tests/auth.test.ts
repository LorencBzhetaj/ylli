import { describe, expect, it } from 'vitest'
import { createSessionToken, hashAccessCode, verifyAccessCode, verifySessionToken } from '@/lib/auth'

const SECRET = 'x'.repeat(48)

describe('access code hashing', () => {
  it('accepts the right code and rejects others', async () => {
    const stored = await hashAccessCode('yll-i-ndritshëm-2026', 100_000)
    expect(stored.startsWith('pbkdf2-sha256:100000:')).toBe(true)
    expect(stored).not.toContain('$')
    expect(await verifyAccessCode('yll-i-ndritshëm-2026', stored)).toBe(true)
    expect(await verifyAccessCode('  yll-i-ndritshëm-2026  ', stored)).toBe(true)
    expect(await verifyAccessCode('yll-i-ndritshem-2026', stored)).toBe(false)
    expect(await verifyAccessCode('', stored)).toBe(false)
  })

  it('normalises Unicode so composed and decomposed ë match', async () => {
    const stored = await hashAccessCode('dritë', 100_000)
    expect(await verifyAccessCode('dritë', stored)).toBe(true)
  })

  it('rejects malformed or weak stored hashes', async () => {
    expect(await verifyAccessCode('a', undefined)).toBe(false)
    expect(await verifyAccessCode('a', 'plain')).toBe(false)
    expect(await verifyAccessCode('a', 'pbkdf2-sha256:10:AAAA:AAAA')).toBe(false)
    expect(await verifyAccessCode('x'.repeat(300), await hashAccessCode('x'.repeat(300), 100_000))).toBe(false)
  })
})

describe('session tokens', () => {
  it('verifies a fresh token', async () => {
    const t = await createSessionToken(SECRET, 60_000)
    expect(await verifySessionToken(t, SECRET)).toBe(true)
  })

  it('rejects expired tokens', async () => {
    const t = await createSessionToken(SECRET, 1_000, Date.now() - 10_000)
    expect(await verifySessionToken(t, SECRET)).toBe(false)
  })

  it('rejects tampered tokens and wrong secrets', async () => {
    const t = await createSessionToken(SECRET, 60_000)
    const [v, exp, nonce, sig] = t.split('.')
    const extended = `${v}.${Number(exp) + 9_999_999}.${nonce}.${sig}`
    expect(await verifySessionToken(extended, SECRET)).toBe(false)
    expect(await verifySessionToken(t, 'y'.repeat(48))).toBe(false)
    expect(await verifySessionToken('garbage', SECRET)).toBe(false)
    expect(await verifySessionToken(undefined, SECRET)).toBe(false)
    expect(await verifySessionToken(t, undefined)).toBe(false)
  })
})
