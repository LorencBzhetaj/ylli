import { NextResponse, type NextRequest } from 'next/server'
import { authConfig, SESSION_COOKIE, verifySessionToken } from '@/lib/auth'

/** Optimistic gate in front of private routes. Pages and private APIs re-check on the server. */
export async function proxy(req: NextRequest) {
  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, authConfig().secret)
  if (ok) return NextResponse.next()
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  const url = req.nextUrl.clone()
  url.pathname = '/'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/experience/:path*', '/api/private/:path*'],
}
