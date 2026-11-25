#!/usr/bin/env node
/**
 * Prepares private gallery media for the site (runs locally, never in the browser).
 *   npm run gallery:prepare                -> private/gallery (or private/placeholders if gallery is empty)
 *   npm run gallery:prepare -- <dir>       -> a specific folder
 *
 * Reads <dir>/gallery.json if present:
 *   { "items": [ { "file": "01.jpg", "caption": "…", "alt": "…" },
 *                { "file": "klip.mp4", "poster": "klip.jpg", "caption": "…" } ] }
 * otherwise lists images/videos alphabetically (a video's poster = image with the same base name).
 * Writes optimised copies + index.json into <dir>/.cache/. Originals are never modified.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// HEIC is not listed: prebuilt sharp has no HEIC decoder — convert iPhone photos to JPG first.
const IMG = /\.(jpe?g|png|webp|avif|tiff?)$/i
const VID = /\.(mp4|webm|mov|m4v)$/i
const root = process.cwd()

function pickDir() {
  if (process.argv[2]) return path.resolve(process.argv[2])
  const g = path.join(root, 'private', 'gallery')
  if (existsSync(g) && readdirSync(g).some((f) => IMG.test(f) || VID.test(f))) return g
  return path.join(root, 'private', 'placeholders')
}

const dir = pickDir()
if (!existsSync(dir)) {
  console.error(`Dosja nuk ekziston: ${dir}\nKrijo placeholder-at me: npm run gallery:placeholders`)
  process.exit(1)
}
const cache = path.join(dir, '.cache')
mkdirSync(cache, { recursive: true })

let manifest
const mPath = path.join(dir, 'gallery.json')
if (existsSync(mPath)) {
  manifest = JSON.parse(readFileSync(mPath, 'utf8'))
} else {
  const files = readdirSync(dir).filter((f) => IMG.test(f) || VID.test(f)).sort()
  const posters = new Set()
  const items = []
  for (const f of files) {
    if (!VID.test(f)) continue
    const base = f.replace(VID, '')
    const poster = files.find((p) => IMG.test(p) && p.replace(IMG, '') === base)
    if (poster) posters.add(poster)
    items.push({ file: f, poster })
  }
  for (const f of files) if (IMG.test(f) && !posters.has(f)) items.push({ file: f })
  items.sort((a, b) => a.file.localeCompare(b.file))
  manifest = { items }
}

const MIME = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' }

/** Two resized copies, aspect ratio preserved ("inside"), EXIF orientation applied. */
async function variants(src, id) {
  const meta = await sharp(src, { failOn: 'none' }).metadata()
  const turned = (meta.orientation ?? 1) >= 5
  const width = turned ? meta.height : meta.width
  const height = turned ? meta.width : meta.height
  await sharp(src).rotate().resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(cache, `${id}-thumb.webp`))
  await sharp(src).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toFile(path.join(cache, `${id}-full.webp`))
  return { width, height }
}

const out = []
let n = 0
for (const item of manifest.items ?? []) {
  n++
  const id = `m${String(n).padStart(2, '0')}`
  const src = path.join(dir, item.file)
  if (!existsSync(src)) {
    console.warn(`  ! mungon: ${item.file} (u anashkalua)`)
    continue
  }
  const base = { id, caption: item.caption ?? '', alt: item.alt ?? item.caption ?? '', placeholder: Boolean(item.placeholder) }
  if (VID.test(item.file)) {
    const ext = path.extname(item.file).toLowerCase()
    const video = `${id}-video${ext}`
    copyFileSync(src, path.join(cache, video))
    let dims = { width: 1280, height: 720 }
    const hasPoster = Boolean(item.poster && existsSync(path.join(dir, item.poster)))
    if (hasPoster) dims = await variants(path.join(dir, item.poster), id)
    else console.warn(`  ! video pa poster: ${item.file} (shto "poster" te gallery.json)`)
    out.push({ ...base, type: 'video', ...dims, hasPoster, video, mime: MIME[ext] ?? 'video/mp4', bytes: statSync(src).size })
  } else {
    out.push({ ...base, type: 'image', ...(await variants(src, id)) })
  }
  console.log(`  ok ${id}  ${item.file}`)
}

writeFileSync(path.join(cache, 'index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), source: path.basename(dir), items: out }, null, 2))
console.log(`\n${out.length} kujtime gati te ${path.relative(root, cache)}`)
