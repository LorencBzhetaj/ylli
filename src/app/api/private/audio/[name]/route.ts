import { createReadStream, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { type NextRequest } from 'next/server'
import { isAuthenticated } from '@/lib/session'
import { parseRange } from '@/lib/gallery'
import { resolveCapsuleVoice, resolveMusic } from '@/lib/privateContent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BASE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' }

export async function GET(req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  if (!(await isAuthenticated())) return new Response(null, { status: 401, headers: BASE })
  const { name } = await ctx.params
  // Only two fixed names; the capsule voice is withheld until the unlock date (server clock).
  const media = name === 'music' ? resolveMusic() : name === 'capsule' ? resolveCapsuleVoice() : null
  if (!media) return new Response(null, { status: 404, headers: BASE })

  const size = statSync(media.file).size
  const range = parseRange(req.headers.get('range'), size)
  if (range === 'invalid') return new Response(null, { status: 416, headers: { ...BASE, 'Content-Range': `bytes */${size}` } })
  const headers: Record<string, string> = { ...BASE, 'Content-Type': media.mime, 'Accept-Ranges': 'bytes' }
  if (range) {
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`
    headers['Content-Length'] = String(range.end - range.start + 1)
    return new Response(Readable.toWeb(createReadStream(media.file, { start: range.start, end: range.end })) as ReadableStream, { status: 206, headers })
  }
  headers['Content-Length'] = String(size)
  return new Response(Readable.toWeb(createReadStream(media.file)) as ReadableStream, { status: 200, headers })
}
