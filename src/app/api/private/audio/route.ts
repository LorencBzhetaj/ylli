import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/session'
import { resolveMusic } from '@/lib/privateContent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' }

/** Which optional audio exists (no file names leave the server). */
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: NO_STORE })
  const music = await resolveMusic()
  return NextResponse.json({ ok: true, music: music ? { url: '/api/private/audio/music', placeholder: music.placeholder } : null }, { headers: NO_STORE })
}
