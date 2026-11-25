import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/session'
import { capsuleView, readCapsuleConfig } from '@/lib/privateContent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: NO_STORE })
  // Server clock decides; a locked capsule response never contains the message.
  return NextResponse.json({ ok: true, now: new Date().toISOString(), ...capsuleView(readCapsuleConfig()) }, { headers: NO_STORE })
}
