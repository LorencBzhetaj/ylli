import { describe, expect, it } from 'vitest'
import { createS3Store, isValidKey, s3ConfigFromEnv } from '@/lib/storage'

const cfg = { endpoint: 'https://acc.r2.cloudflarestorage.com', bucket: 'nadia-private', region: 'auto', accessKeyId: 'AKID', secretAccessKey: 'SECRET', prefix: 'v1' }

function fakeBucket(objects: Record<string, string>) {
  const calls: Request[] = []
  const impl = (async (input: RequestInfo | URL) => {
    const req = input as Request
    calls.push(req)
    const url = new URL(req.url)
    if (url.searchParams.get('list-type') === '2') {
      const prefix = url.searchParams.get('prefix') ?? ''
      const keys = Object.keys(objects).filter((k) => k.startsWith(prefix))
      return new Response(`<ListBucketResult>${keys.map((k) => `<Contents><Key>${k}</Key></Contents>`).join('')}</ListBucketResult>`)
    }
    const key = decodeURIComponent(url.pathname.replace(`/${cfg.bucket}/`, ''))
    const body = objects[key]
    if (body === undefined) return new Response('NoSuchKey', { status: 404 })
    const range = req.headers.get('range')
    if (range) {
      const [, a, b] = /bytes=(\d+)-(\d+)/.exec(range)!
      const part = body.slice(Number(a), Number(b) + 1)
      return new Response(req.method === 'HEAD' ? null : part, { status: 206, headers: { 'content-range': `bytes ${a}-${b}/${body.length}`, 'content-length': String(part.length) } })
    }
    return new Response(req.method === 'HEAD' ? null : body, { headers: { 'content-length': String(body.length) } })
  }) as typeof fetch
  return { impl, calls }
}

describe('S3-compatible store (R2 / S3 / B2)', () => {
  it('reads, sizes, streams with Range and lists — every request SigV4-signed', async () => {
    const { impl, calls } = fakeBucket({ 'v1/text/letter.md': 'E dashur Nadia,', 'v1/gallery/m01-full.webp': '0123456789', 'v1/audio/music.mp3': 'abc' })
    const store = createS3Store(cfg, impl)
    expect(await store.readText('text/letter.md')).toBe('E dashur Nadia,')
    expect(await store.readText('text/capsule.json')).toBeNull()
    expect(await store.size('gallery/m01-full.webp')).toBe(10)
    const part = (await store.stream('gallery/m01-full.webp', { start: 2, end: 5 }))!
    expect(part.size).toBe(10)
    expect(await new Response(part.body).text()).toBe('2345')
    expect(await store.list('audio/')).toEqual(['audio/music.mp3'])
    for (const c of calls) {
      expect(c.headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\/\d{8}\/auto\/s3\/aws4_request/)
      expect(c.url.startsWith('https://acc.r2.cloudflarestorage.com/nadia-private')).toBe(true)
    }
  })

  it('never sends a request for an invalid key', async () => {
    const { impl, calls } = fakeBucket({})
    const store = createS3Store(cfg, impl)
    expect(await store.readText('../secrets')).toBeNull()
    expect(await store.size('gallery/../../x')).toBeNull()
    expect(await store.stream('public/x.jpg')).toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('validates keys and env config', () => {
    expect(isValidKey('gallery/m01-thumb.webp')).toBe(true)
    expect(isValidKey('audio/music.placeholder.mp3')).toBe(true)
    expect(isValidKey('gallery/.cache')).toBe(false)
    expect(isValidKey('text/a/b')).toBe(false)
    expect(s3ConfigFromEnv({ S3_ENDPOINT: 'https://x/', S3_BUCKET: 'b' } as unknown as NodeJS.ProcessEnv)).toBeNull()
    expect(s3ConfigFromEnv({ S3_ENDPOINT: 'https://x/', S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'k', S3_SECRET_ACCESS_KEY: 's', S3_PREFIX: '/p/' } as unknown as NodeJS.ProcessEnv)).toMatchObject({
      endpoint: 'https://x',
      region: 'auto',
      prefix: 'p',
    })
  })
})
