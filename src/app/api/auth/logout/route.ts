import { NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  // Expire the cookie and ask the browser to drop anything cached for this origin.
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store', 'Clear-Site-Data': '"cache"' } })
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return res
}
