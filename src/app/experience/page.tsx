import { redirect } from 'next/navigation'
import Experience from '@/components/Experience'
import { isAuthenticated } from '@/lib/session'
import { certificateProps, dedication, formatDateSq } from '@/lib/dedication'
import { regulus } from '@/lib/astronomy'

export const dynamic = 'force-dynamic'

export default async function ExperiencePage() {
  // Defence in depth: the proxy already redirects, but never trust a single layer.
  if (!(await isAuthenticated())) redirect('/')
  return (
    <Experience
      recipient={dedication.recipient}
      privateId={dedication.privateId}
      birthday={formatDateSq(dedication.birthday)}
      star={regulus}
      astronomyVerified={dedication.astronomyVerified && regulus.verified}
      certificate={await certificateProps()}
    />
  )
}
