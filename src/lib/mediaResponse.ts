/** Shared streaming response for private media (gallery + audio): auth already checked by the caller. */
import { getStore } from './storage'
import { parseRange } from './gallery'

export const PRIVATE_MEDIA_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
} as const

export const deny = (status: number) => new Response(null, { status, headers: PRIVATE_MEDIA_HEADERS })

export async function streamPrivate(key: string, mime: string, rangeHeader: string | null): Promise<Response> {
  const store = getStore()
  const size = await store.size(key)
  if (size === null) return deny(404)
  const range = parseRange(rangeHeader, size)
  if (range === 'invalid') {
    return new Response(null, { status: 416, headers: { ...PRIVATE_MEDIA_HEADERS, 'Content-Range': `bytes */${size}` } })
  }
  const obj = await store.stream(key, range ?? undefined)
  if (!obj) return deny(404)
  const headers: Record<string, string> = { ...PRIVATE_MEDIA_HEADERS, 'Content-Type': mime, 'Accept-Ranges': 'bytes' }
  if (range) {
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`
    headers['Content-Length'] = String(range.end - range.start + 1)
    return new Response(obj.body, { status: 206, headers })
  }
  headers['Content-Length'] = String(size)
  return new Response(obj.body, { status: 200, headers })
}
