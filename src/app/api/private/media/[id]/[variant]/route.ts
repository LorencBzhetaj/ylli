import { createReadStream, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { type NextRequest } from 'next/server'
import { isAuthenticated } from '@/lib/session'
import { parseRange, resolveMedia } from '@/lib/gallery'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BASE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

function deny(status: number) {
  return new Response(null, { status, headers: BASE_HEADERS })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; variant: string }> }) {
  if (!(await isAuthenticated())) return deny(401)
  const { id, variant } = await ctx.params
  const media = resolveMedia(id, variant)
  if (!media) return deny(404)

  const size = statSync(media.file).size
  const range = parseRange(req.headers.get('range'), size)
  if (range === 'invalid') {
    return new Response(null, { status: 416, headers: { ...BASE_HEADERS, 'Content-Range': `bytes */${size}` } })
  }
  const headers: Record<string, string> = { ...BASE_HEADERS, 'Content-Type': media.mime, 'Accept-Ranges': 'bytes' }
  if (range) {
    const body = Readable.toWeb(createReadStream(media.file, { start: range.start, end: range.end })) as ReadableStream
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`
    headers['Content-Length'] = String(range.end - range.start + 1)
    return new Response(body, { status: 206, headers })
  }
  headers['Content-Length'] = String(size)
  return new Response(Readable.toWeb(createReadStream(media.file)) as ReadableStream, { status: 200, headers })
}
