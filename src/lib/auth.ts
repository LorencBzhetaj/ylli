/**
 * Access-code verification and signed session cookies.
 * Uses only Web Crypto so it runs in Route Handlers, Server Components and Proxy alike.
 *
 * ACCESS_CODE_HASH format:  pbkdf2-sha256:<iterations>:<salt b64url>:<hash b64url>
 * (":" instead of "$" so Next.js env expansion never mangles it.)
 */

export const SESSION_COOKIE = 'nadia_session'
const encoder = new TextEncoder()

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ''
  for (const b of arr) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Constant-time comparison of two byte arrays. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/** Normalise user input: trim and Unicode-normalise so "ë" typed two ways matches. */
export function normaliseCode(code: string): string {
  return code.normalize('NFC').trim()
}

async function pbkdf2(code: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(normaliseCode(code)), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

export async function hashAccessCode(code: string, iterations = 210_000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
  const hash = await pbkdf2(code, salt, iterations)
  return `pbkdf2-sha256:${iterations}:${b64url(salt)}:${b64url(hash)}`
}

export async function verifyAccessCode(code: string, stored: string | undefined): Promise<boolean> {
  if (!stored || typeof code !== 'string' || code.length === 0 || code.length > 256) return false
  const parts = stored.split(':')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations < 100_000) return false
  const expected = fromB64url(parts[3])
  const actual = await pbkdf2(code, fromB64url(parts[2]), iterations)
  return timingSafeEqual(actual, expected)
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

/** Session token: v1.<expiresAtMs>.<nonce>.<hmac> */
export async function createSessionToken(secret: string, ttlMs: number, now = Date.now()): Promise<string> {
  const exp = now + ttlMs
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12))))
  const payload = `v1.${exp}.${nonce}`
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload))
  return `${payload}.${b64url(sig)}`
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return false
  const exp = Number(parts[1])
  if (!Number.isFinite(exp) || exp <= now) return false
  try {
    return await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      fromB64url(parts[3]),
      encoder.encode(`${parts[0]}.${parts[1]}.${parts[2]}`),
    )
  } catch {
    return false
  }
}

export function authConfig() {
  const secret = process.env.SESSION_SECRET
  const hash = process.env.ACCESS_CODE_HASH
  const ttlHours = Number(process.env.SESSION_TTL_HOURS ?? 12)
  return {
    configured: Boolean(secret && secret.length >= 32 && hash),
    secret,
    hash,
    ttlMs: (Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 12) * 3_600_000,
  }
}
