import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/session'
import { readLetter } from '@/lib/privateContent'
import { dedication } from '@/lib/dedication'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: NO_STORE })
  return NextResponse.json({ ok: true, ...(await readLetter()), signature: dedication.giver }, { headers: NO_STORE })
}
