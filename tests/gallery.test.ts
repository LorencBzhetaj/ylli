import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { __resetGalleryCache, loadGallery, parseRange, resolveMedia, toPublic, type GalleryItem } from '@/lib/gallery'
import { __setStore, localStore } from '@/lib/storage'

let dir: string
const prevEnv = process.env.GALLERY_DIR

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'nadia-gallery-'))
  const cache = path.join(dir, '.cache')
  mkdirSync(cache)
  const items: GalleryItem[] = [
    { id: 'm01', type: 'image', caption: 'Një kujtim', alt: 'Foto', width: 1800, height: 1200, placeholder: true },
    { id: 'm02', type: 'video', caption: 'Klip', alt: 'Video', width: 1280, height: 720, placeholder: false, hasPoster: true, video: 'm02-video.mp4', mime: 'video/mp4' },
    { id: 'm03', type: 'video', caption: '', alt: '', width: 1280, height: 720, placeholder: false, hasPoster: false, video: 'm03-video.mp4', mime: 'video/mp4' },
    // a tampered index entry must never escape the gallery folder
    { id: 'm04', type: 'video', caption: '', alt: '', width: 1, height: 1, placeholder: false, hasPoster: false, video: '../secret.txt', mime: 'text/plain' },
    { id: '../evil', type: 'image', caption: '', alt: '', width: 1, height: 1, placeholder: false },
  ]
  writeFileSync(path.join(cache, 'index.json'), JSON.stringify({ source: 'test', items }))
  for (const f of ['m01-thumb.webp', 'm01-full.webp', 'm02-thumb.webp', 'm02-full.webp', 'm02-video.mp4', 'm03-video.mp4']) writeFileSync(path.join(cache, f), 'x')
  writeFileSync(path.join(dir, 'secret.txt'), 'secret')
  process.env.GALLERY_DIR = dir
  __setStore(localStore)
})

beforeEach(() => __resetGalleryCache())

afterAll(() => {
  process.env.GALLERY_DIR = prevEnv
  __setStore(null)
  rmSync(dir, { recursive: true, force: true })
})

describe('gallery index', () => {
  it('loads items and drops ids that are not m + digits', async () => {
    const g = (await loadGallery())!
    expect(g.items.map((i) => i.id)).toEqual(['m01', 'm02', 'm03', 'm04'])
  })

  it('exposes only session-gated API urls, never file names', async () => {
    const items = (await loadGallery())!.items.map(toPublic)
    expect(items[0]).toMatchObject({ thumb: '/api/private/media/m01/thumb', full: '/api/private/media/m01/full', video: null })
    expect(items[1].video).toBe('/api/private/media/m02/video')
    expect(items[2].thumb).toBeNull() // video without poster
    expect(JSON.stringify(items)).not.toMatch(/\.mp4|\.webp|secret/)
  })
})

describe('resolveMedia + local store', () => {
  it('resolves known variants to existing objects', async () => {
    const thumb = (await resolveMedia('m01', 'thumb'))!
    expect(thumb).toEqual({ key: 'gallery/m01-thumb.webp', mime: 'image/webp' })
    expect(await localStore.size(thumb.key)).toBe(1)
    expect((await resolveMedia('m02', 'video'))?.mime).toBe('video/mp4')
  })

  it('rejects unknown ids, variants and traversal', async () => {
    expect(await resolveMedia('m99', 'full')).toBeNull()
    expect(await resolveMedia('m01', 'video')).toBeNull()
    expect(await resolveMedia('m01', 'index')).toBeNull()
    expect(await resolveMedia('m03', 'thumb')).toBeNull()
    expect(await resolveMedia('../evil', 'full')).toBeNull()
    expect(await resolveMedia('m04', 'video')).toBeNull()
    expect(await localStore.size('gallery/../secret.txt')).toBeNull()
    expect(await localStore.readText('text/../../.env.local')).toBeNull()
    expect(await localStore.size('other/file')).toBeNull()
  })
})

describe('parseRange', () => {
  it('parses single ranges', () => {
    expect(parseRange(null, 100)).toBeNull()
    expect(parseRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 })
    expect(parseRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 })
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 })
    expect(parseRange('bytes=50-500', 100)).toEqual({ start: 50, end: 99 })
  })

  it('flags unsatisfiable or malformed ranges', () => {
    expect(parseRange('bytes=100-', 100)).toBe('invalid')
    expect(parseRange('bytes=9-1', 100)).toBe('invalid')
    expect(parseRange('bytes=-', 100)).toBe('invalid')
    expect(parseRange('bytes=0-1,5-6', 100)).toBe('invalid')
    expect(parseRange('items=0-1', 100)).toBe('invalid')
  })
})
