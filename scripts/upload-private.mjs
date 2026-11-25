#!/usr/bin/env node
/**
 * Upload prepared private content to the PRIVATE S3-compatible bucket used in production.
 *
 *   node --env-file=.env.production.local scripts/upload-private.mjs            (dry run: lists what would be uploaded)
 *   node --env-file=.env.production.local scripts/upload-private.mjs --yes      (uploads)
 *   … --allow-placeholders   also uploads placeholder gallery/audio (testing a deploy before real photos exist)
 *
 * Needs S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (+ optional S3_REGION, S3_PREFIX).
 * The bucket must stay private (no public access, no public r2.dev URL). Objects are written with no ACL.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { AwsClient } from 'aws4fetch'

const yes = process.argv.includes('--yes')
const allowPlaceholders = process.argv.includes('--allow-placeholders')
const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env
if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error('Mungojnë S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY (shih docs/DEPLOY.md).')
  process.exit(1)
}
const prefix = (process.env.S3_PREFIX || '').replace(/^\/+|\/+$/g, '')
const client = new AwsClient({ accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY, service: 's3', region: process.env.S3_REGION || 'auto' })

const MIME = { '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.wav': 'audio/wav' }
const root = process.cwd()
const files = []

const real = path.join(root, 'private', 'gallery', '.cache')
const ph = path.join(root, 'private', 'placeholders', '.cache')
const galleryDir = existsSync(path.join(real, 'index.json')) ? real : allowPlaceholders && existsSync(path.join(ph, 'index.json')) ? ph : null
if (galleryDir) for (const n of readdirSync(galleryDir)) files.push({ local: path.join(galleryDir, n), key: `gallery/${n}` })
else console.warn('! Pa galeri të përgatitur (npm run gallery:prepare). Me --allow-placeholders ngarkohen placeholder-at.')

for (const area of ['text', 'audio']) {
  const d = path.join(root, 'private', area)
  if (!existsSync(d)) continue
  for (const n of readdirSync(d)) {
    if (!statSync(path.join(d, n)).isFile() || n.startsWith('.')) continue
    if (/\.placeholder\./.test(n) && !allowPlaceholders) continue
    files.push({ local: path.join(d, n), key: `${area}/${n}` })
  }
}

const total = files.reduce((s, f) => s + statSync(f.local).size, 0)
console.log(`${files.length} skedarë, ${(total / 1048576).toFixed(1)} MB → ${S3_BUCKET}${prefix ? '/' + prefix : ''}`)
for (const f of files) console.log(`  ${f.key}`)
if (!yes) {
  console.log('\nDry run. Shto --yes për t’i ngarkuar.')
  process.exit(0)
}

for (const f of files) {
  const key = prefix ? `${prefix}/${f.key}` : f.key
  const url = `${S3_ENDPOINT.replace(/\/+$/, '')}/${encodeURIComponent(S3_BUCKET)}/${key.split('/').map(encodeURIComponent).join('/')}`
  const body = readFileSync(f.local)
  const res = await client.fetch(url, { method: 'PUT', body, headers: { 'Content-Type': MIME[path.extname(f.local).toLowerCase()] ?? 'application/octet-stream' } })
  console.log(`${res.ok ? 'ok ' : 'ERR'} ${f.key}${res.ok ? '' : ` (${res.status})`}`)
  if (!res.ok) process.exitCode = 1
}
