import { redirect } from 'next/navigation'
import AccessGate from '@/components/AccessGate'
import { authConfig } from '@/lib/auth'
import { isAuthenticated } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function EntryPage() {
  if (await isAuthenticated()) redirect('/experience')
  return <AccessGate configured={authConfig().configured} />
}
