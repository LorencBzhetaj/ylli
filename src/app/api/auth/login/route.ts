import { NextResponse, type NextRequest } from 'next/server'
import { authConfig, createSessionToken, SESSION_COOKIE, verifyAccessCode } from '@/lib/auth'
import { globalLoginLimiter, loginLimiter } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
}

export async function POST(req: NextRequest) {
  const cfg = authConfig()
  if (!cfg.configured) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  const ip = clientIp(req)
  const perIp = loginLimiter.hit(ip)
  const global = globalLoginLimiter.hit('global')
  if (!perIp.allowed || !global.allowed) {
    const retry = Math.ceil(Math.max(perIp.retryAfterMs, global.retryAfterMs) / 1000)
    return NextResponse.json({ ok: false, error: 'rate_limited', retryAfter: retry }, { status: 429, headers: { 'Retry-After': String(retry) } })
  }

  let code = ''
  try {
    const body = (await req.json()) as { code?: unknown }
    code = typeof body.code === 'string' ? body.code : ''
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const valid = await verifyAccessCode(code, cfg.hash)
  if (!valid) {
    return NextResponse.json({ ok: false, error: 'invalid', remaining: perIp.remaining }, { status: 401 })
  }

  loginLimiter.reset(ip)
  const token = await createSessionToken(cfg.secret!, cfg.ttlMs)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: Math.floor(cfg.ttlMs / 1000),
  })
  return res
}
