import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/session'
import { currentCapsuleView } from '@/lib/privateContent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: NO_STORE })
  // Server clock decides; a locked capsule response never contains the message.
  const now = new Date()
  return NextResponse.json({ ok: true, now: now.toISOString(), ...(await currentCapsuleView(now)) }, { headers: NO_STORE })
}
