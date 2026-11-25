/**
 * Server-only access to the prepared private gallery (see scripts/prepare-gallery.mjs).
 * Media are read from private/<dir>/.cache — never from public/ — and only by id from the index,
 * so a request can never name an arbitrary file path.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

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

export type Variant = 'thumb' | 'full' | 'video'

type Index = { source: string; items: GalleryItem[] }

const ID = /^m\d{2,3}$/

function candidateDirs(): string[] {
  // turbopackIgnore: these are runtime-only local folders; they must never be traced into the build.
  const root = /* turbopackIgnore: true */ process.cwd()
  const fromEnv = process.env.GALLERY_DIR ? [path.resolve(root, process.env.GALLERY_DIR)] : []
  return [...fromEnv, path.join(root, 'private', 'gallery'), path.join(root, 'private', 'placeholders')]
}

let cached: { dir: string; mtime: number; index: Index } | null = null

export function loadGallery(): { cacheDir: string; index: Index } | null {
  for (const dir of candidateDirs()) {
    const cacheDir = path.join(dir, '.cache')
    const file = path.join(cacheDir, 'index.json')
    if (!existsSync(file)) continue
    const mtime = statSync(file).mtimeMs
    if (cached && cached.dir === cacheDir && cached.mtime === mtime) return { cacheDir, index: cached.index }
    const index = JSON.parse(readFileSync(file, 'utf8')) as Index
    index.items = (index.items ?? []).filter((it) => ID.test(it.id))
    cached = { dir: cacheDir, mtime, index }
    return { cacheDir, index }
  }
  return null
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

/** Resolve a media file for (id, variant), or null. Guards against path escape. */
export function resolveMedia(id: string, variant: string): { file: string; mime: string } | null {
  if (!ID.test(id) || !['thumb', 'full', 'video'].includes(variant)) return null
  const g = loadGallery()
  if (!g) return null
  const item = g.index.items.find((it) => it.id === id)
  if (!item) return null
  let name: string
  let mime: string
  if (variant === 'video') {
    if (item.type !== 'video' || !item.video) return null
    name = item.video
    mime = item.mime ?? 'video/mp4'
  } else {
    if (item.type === 'video' && !item.hasPoster) return null
    name = `${id}-${variant}.webp`
    mime = 'image/webp'
  }
  const file = path.resolve(g.cacheDir, name)
  const rel = path.relative(g.cacheDir, file)
  if (rel.startsWith('..') || path.isAbsolute(rel) || !existsSync(file)) return null
  return { file, mime }
}

/** Parse a single HTTP byte range. Returns null for absent/unsatisfiable/multi ranges. */
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
