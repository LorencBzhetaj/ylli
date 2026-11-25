/**
 * Server-only access to the prepared private gallery (see scripts/prepare-gallery.mjs).
 * Reads gallery/index.json from the private store (local private/… or a private S3/R2 bucket).
 * Media are addressed only by id + variant from the index — a request can never name a file.
 */
import { getStore } from './storage'

export type GalleryItem = {
  id: string
  type: 'image' | 'video'
  caption: string
  alt: string
  width: number
  height: number
  placeholder: boolean
  hasPoster?: boolean
  video?: string
  mime?: string
}

export type PublicGalleryItem = Omit<GalleryItem, 'video' | 'mime' | 'hasPoster'> & {
  thumb: string | null
  full: string | null
  video: string | null
}

type Index = { source: string; items: GalleryItem[] }

const ID = /^m\d{2,3}$/
const TTL_MS = 15_000
let cached: { at: number; index: Index | null; storeKind: string } | null = null

export async function loadGallery(): Promise<Index | null> {
  const store = getStore()
  if (cached && cached.storeKind === store.kind && Date.now() - cached.at < TTL_MS) return cached.index
  const raw = await store.readText('gallery/index.json')
  let index: Index | null = null
  if (raw) {
    const parsed = JSON.parse(raw) as Index
    index = { source: parsed.source, items: (parsed.items ?? []).filter((it) => ID.test(it.id)) }
  }
  cached = { at: Date.now(), index, storeKind: store.kind }
  return index
}

/** Tests only. */
export function __resetGalleryCache() {
  cached = null
}

export function toPublic(item: GalleryItem): PublicGalleryItem {
  const base = `/api/private/media/${item.id}`
  const hasImage = item.type === 'image' || Boolean(item.hasPoster)
  return {
    id: item.id,
    type: item.type,
    caption: item.caption,
    alt: item.alt,
    width: item.width,
    height: item.height,
    placeholder: item.placeholder,
    thumb: hasImage ? `${base}/thumb` : null,
    full: hasImage ? `${base}/full` : null,
    video: item.type === 'video' ? `${base}/video` : null,
  }
}

/** Map (id, variant) → storage key + mime, or null. */
export async function resolveMedia(id: string, variant: string): Promise<{ key: string; mime: string } | null> {
  if (!ID.test(id) || !['thumb', 'full', 'video'].includes(variant)) return null
  const index = await loadGallery()
  const item = index?.items.find((it) => it.id === id)
  if (!item) return null
  if (variant === 'video') {
    if (item.type !== 'video' || !item.video || !/^[\w.-]+$/.test(item.video)) return null
    return { key: `gallery/${item.video}`, mime: item.mime ?? 'video/mp4' }
  }
  if (item.type === 'video' && !item.hasPoster) return null
  return { key: `gallery/${id}-${variant}.webp`, mime: 'image/webp' }
}

/** Parse a single HTTP byte range. Returns null for absent, 'invalid' for unsatisfiable/multi ranges. */
export function parseRange(header: string | null, size: number): { start: number; end: number } | 'invalid' | null {
  if (!header) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m || (m[1] === '' && m[2] === '')) return 'invalid'
  let start: number
  let end: number
  if (m[1] === '') {
    const suffix = Number(m[2])
    if (suffix === 0) return 'invalid'
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
  }
  if (start > end || start >= size) return 'invalid'
  return { start, end }
}
