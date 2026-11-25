import { type NextRequest } from 'next/server'
import { isAuthenticated } from '@/lib/session'
import { resolveCapsuleVoice, resolveMusic } from '@/lib/privateContent'
import { deny, streamPrivate } from '@/lib/mediaResponse'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  if (!(await isAuthenticated())) return deny(401)
  const { name } = await ctx.params
  // Only two fixed names; the capsule voice is withheld until the unlock date (server clock).
  const media = name === 'music' ? await resolveMusic() : name === 'capsule' ? await resolveCapsuleVoice() : null
  if (!media) return deny(404)
  return streamPrivate(media.key, media.mime, req.headers.get('range'))
}
