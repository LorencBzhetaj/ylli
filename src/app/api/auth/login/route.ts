import { NextResponse, type NextRequest } from 'next/server'
import { authConfig, createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyAccessCode } from '@/lib/auth'
import { globalLoginLimiter, loginLimiter, type HitResult } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store' }

/** On Vercel the first X-Forwarded-For entry is set by the platform; locally it's whatever the client sends. */
function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
}

/** Reject cross-site login posts (the session cookie is SameSite=Strict anyway). */
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true // non-browser clients (curl, tests) send no Origin
  try {
    return new URL(origin).host === req.headers.get('host')
  } catch {
    return false
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  const cfg = authConfig()
  if (!cfg.configured) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503, headers: NO_STORE })
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403, headers: NO_STORE })

  const ip = clientIp(req)
  let perIp: HitResult
  let global: HitResult
  try {
    ;[perIp, global] = await Promise.all([loginLimiter.hit(ip), globalLoginLimiter.hit('global')])
  } catch {
    // Fail closed: if the shared limiter is unreachable, no guessing is possible either.
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503, headers: NO_STORE })
  }
  if (!perIp.allowed || !global.allowed) {
    const retry = Math.ceil(Math.max(perIp.retryAfterMs, global.retryAfterMs) / 1000)
    return NextResponse.json({ ok: false, error: 'rate_limited', retryAfter: retry }, { status: 429, headers: { ...NO_STORE, 'Retry-After': String(retry) } })
  }

  let code = ''
  try {
    const body = (await req.json()) as { code?: unknown }
    code = typeof body.code === 'string' ? body.code : ''
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400, headers: NO_STORE })
  }

  const valid = await verifyAccessCode(code, cfg.hash)
  if (!valid) {
    await sleep(350 + Math.random() * 250) // slow down guessing, blur timing
    return NextResponse.json({ ok: false, error: 'invalid', remaining: perIp.remaining }, { status: 401, headers: NO_STORE })
  }

  await loginLimiter.reset(ip).catch(() => {})
  const token = await createSessionToken(cfg.secret!, cfg.ttlMs)
  const res = NextResponse.json({ ok: true }, { headers: NO_STORE })
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(Math.floor(cfg.ttlMs / 1000)))
  return res
}
