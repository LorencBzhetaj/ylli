import { type NextRequest } from 'next/server'
import { isAuthenticated } from '@/lib/session'
import { resolveMedia } from '@/lib/gallery'
import { deny, streamPrivate } from '@/lib/mediaResponse'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; variant: string }> }) {
  if (!(await isAuthenticated())) return deny(401)
  const { id, variant } = await ctx.params
  const media = await resolveMedia(id, variant)
  if (!media) return deny(404)
  return streamPrivate(media.key, media.mime, req.headers.get('range'))
}
