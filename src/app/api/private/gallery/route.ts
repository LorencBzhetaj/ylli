import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/session'
import { loadGallery, toPublic } from '@/lib/gallery'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET() {
  // Proxy already gates /api/private/*, re-check here (defence in depth).
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: NO_STORE })
  }
  const g = loadGallery()
  if (!g) return NextResponse.json({ ok: true, items: [], needsPrepare: true }, { headers: NO_STORE })
  return NextResponse.json(
    { ok: true, source: g.index.source, items: g.index.items.map(toPublic) },
    { headers: NO_STORE },
  )
}
