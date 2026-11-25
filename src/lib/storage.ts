/**
 * Private storage — one interface, two drivers.
 *
 *   local (default, dev): files under private/ on this machine (git-ignored, never traced into the build)
 *   s3    (production):   any S3-compatible PRIVATE bucket (Cloudflare R2, AWS S3, Backblaze B2 …),
 *                         read server-side with signed requests; objects are never public and never get public URLs.
 *
 * Key layout (same for both drivers):
 *   gallery/index.json, gallery/m01-thumb.webp, gallery/m01-full.webp, gallery/m05-video.mp4 …
 *   text/letter.md, text/capsule.json
 *   audio/music.mp3, audio/<capsule voice>
 */
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { AwsClient } from 'aws4fetch'

export type ByteRange = { start: number; end: number }
export type ObjectStream = { body: ReadableStream; size: number }

export interface PrivateStore {
  readonly kind: 'local' | 's3'
  /** Small text objects (JSON / Markdown). */
  readText(key: string): Promise<string | null>
  size(key: string): Promise<number | null>
  stream(key: string, range?: ByteRange): Promise<ObjectStream | null>
  list(prefix: string): Promise<string[]>
}

const KEY = /^(gallery|text|audio)\/[A-Za-z0-9][\w.-]*$/
export const isValidKey = (key: string) => KEY.test(key) && !key.includes('..')

// ——— local driver ———
const root = () => /* turbopackIgnore: true */ process.cwd()

/** Gallery source folder: GALLERY_DIR → private/gallery → private/placeholders (first with a prepared .cache). */
function localGalleryCache(): string | null {
  const r = root()
  const dirs = [
    ...(process.env.GALLERY_DIR ? [path.resolve(r, process.env.GALLERY_DIR)] : []),
    path.join(r, 'private', 'gallery'),
    path.join(r, 'private', 'placeholders'),
  ]
  for (const d of dirs) if (existsSync(path.join(d, '.cache', 'index.json'))) return path.join(d, '.cache')
  return null
}

function localPath(key: string): string | null {
  if (!isValidKey(key)) return null
  const [area, name] = key.split('/')
  const base = area === 'gallery' ? localGalleryCache() : path.join(root(), 'private', area)
  if (!base) return null
  const file = path.resolve(base, name)
  const rel = path.relative(base, file)
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null
  return existsSync(file) && statSync(file).isFile() ? file : null
}

export const localStore: PrivateStore = {
  kind: 'local',
  async readText(key) {
    const f = localPath(key)
    return f ? readFileSync(f, 'utf8') : null
  },
  async size(key) {
    const f = localPath(key)
    return f ? statSync(f).size : null
  },
  async stream(key, range) {
    const f = localPath(key)
    if (!f) return null
    const size = statSync(f).size
    const s = range ? createReadStream(f, { start: range.start, end: range.end }) : createReadStream(f)
    return { body: Readable.toWeb(s) as ReadableStream, size }
  },
  async list(prefix) {
    const area = prefix.replace(/\/$/, '')
    const base = area === 'gallery' ? localGalleryCache() : path.join(root(), 'private', area)
    if (!base || !existsSync(base)) return []
    return readdirSync(base)
      .filter((n) => isValidKey(`${area}/${n}`))
      .map((n) => `${area}/${n}`)
  },
}

// ——— S3-compatible driver ———
export type S3Config = { endpoint: string; bucket: string; region: string; accessKeyId: string; secretAccessKey: string; prefix: string }

export function s3ConfigFromEnv(env: NodeJS.ProcessEnv = process.env): S3Config | null {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null
  return {
    endpoint: S3_ENDPOINT.replace(/\/+$/, ''),
    bucket: S3_BUCKET,
    region: env.S3_REGION || 'auto',
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    prefix: (env.S3_PREFIX || '').replace(/^\/+|\/+$/g, ''),
  }
}

export function createS3Store(cfg: S3Config, fetchImpl: typeof fetch = fetch): PrivateStore {
  const client = new AwsClient({ accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, service: 's3', region: cfg.region })
  const objectUrl = (key: string) =>
    `${cfg.endpoint}/${encodeURIComponent(cfg.bucket)}/${(cfg.prefix ? `${cfg.prefix}/${key}` : key).split('/').map(encodeURIComponent).join('/')}`
  const send = async (url: string, init: RequestInit) => fetchImpl(await client.sign(url, init) as Request)

  return {
    kind: 's3',
    async readText(key) {
      if (!isValidKey(key)) return null
      const r = await send(objectUrl(key), { method: 'GET' })
      if (r.status === 404 || r.status === 403) return null
      if (!r.ok) throw new Error(`storage ${r.status}`)
      return r.text()
    },
    async size(key) {
      if (!isValidKey(key)) return null
      const r = await send(objectUrl(key), { method: 'HEAD' })
      if (!r.ok) return null
      const n = Number(r.headers.get('content-length'))
      return Number.isFinite(n) ? n : null
    },
    async stream(key, range) {
      if (!isValidKey(key)) return null
      const headers: Record<string, string> = range ? { Range: `bytes=${range.start}-${range.end}` } : {}
      const r = await send(objectUrl(key), { method: 'GET', headers })
      if (r.status === 404 || r.status === 403) return null
      if (!r.ok || !r.body) throw new Error(`storage ${r.status}`)
      const total = range ? Number(r.headers.get('content-range')?.split('/')[1]) : Number(r.headers.get('content-length'))
      return { body: r.body, size: total }
    },
    async list(prefix) {
      const p = cfg.prefix ? `${cfg.prefix}/${prefix}` : prefix
      const url = `${cfg.endpoint}/${encodeURIComponent(cfg.bucket)}?list-type=2&prefix=${encodeURIComponent(p)}`
      const r = await send(url, { method: 'GET' })
      if (!r.ok) return []
      const xml = await r.text()
      return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)]
        .map((m) => m[1].replace(/&amp;/g, '&'))
        .map((k) => (cfg.prefix ? k.slice(cfg.prefix.length + 1) : k))
        .filter(isValidKey)
    },
  }
}

let current: PrivateStore | null = null
/** STORAGE_DRIVER=s3 + S3_* env → bucket; otherwise local private/ folder. */
export function getStore(): PrivateStore {
  if (current) return current
  if (process.env.STORAGE_DRIVER === 's3') {
    const cfg = s3ConfigFromEnv()
    if (!cfg) throw new Error('STORAGE_DRIVER=s3 but S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are missing')
    current = createS3Store(cfg)
  } else {
    current = localStore
  }
  return current
}

/** Tests only. */
export function __setStore(s: PrivateStore | null) {
  current = s
}
