#!/usr/bin/env node
/**
 * "No private assets in build / public / Git" audit (M5). Run after `npm run build`:  npm run audit:private
 *   1. Git tracks nothing from private/ (except its README), no .env files, no personal media.
 *   2. There is no public/ folder with media.
 *   3. No server bundle trace (*.nft.json) references private/ or .env files.
 *   4. No static build asset is a photo / video / audio file.
 *   5. Private text (letter, capsule message) does not appear anywhere in the build output.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
let fail = 0
const ok = (cond, label, extra = '') => {
  if (!cond) fail++
  console.log(`${cond ? '  ✓' : '  ✗'} ${label}${extra ? `  — ${extra}` : ''}`)
}
const MEDIA = /\.(jpe?g|png|webp|avif|heic|gif|tiff?|mp4|mov|webm|m4v|mp3|m4a|aac|ogg|wav)$/i

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

console.log('\n1. Git')
const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean)
const privTracked = tracked.filter((f) => f.startsWith('private/') && f !== 'private/README.md')
ok(privTracked.length === 0, 'nothing from private/ is tracked', privTracked.slice(0, 3).join(', '))
const envTracked = tracked.filter((f) => /(^|\/)\.env/.test(f) && !f.endsWith('.env.example'))
ok(envTracked.length === 0, 'no .env files tracked', envTracked.join(', '))
const mediaTracked = tracked.filter((f) => MEDIA.test(f) && f !== 'assets/approved-mockup.png')
ok(mediaTracked.length === 0, 'no media tracked except the approved mockup', mediaTracked.slice(0, 3).join(', '))

console.log('\n2. public/')
const pub = walk(path.join(root, 'public')).filter((f) => MEDIA.test(f))
ok(pub.length === 0, 'no media in public/', pub.slice(0, 3).join(', '))

console.log('\n3. Server bundle traces')
const next = path.join(root, '.next')
if (!existsSync(next)) {
  ok(false, '.next missing — run `npm run build` first')
} else {
  const traces = walk(next).filter((f) => f.endsWith('.nft.json'))
  const offenders = []
  for (const t of traces) {
    const files = JSON.parse(readFileSync(t, 'utf8')).files ?? []
    for (const f of files) {
      const abs = path.resolve(path.dirname(t), f)
      const rel = path.relative(root, abs).replace(/\\/g, '/')
      if (rel.startsWith('private/') || /^\.env/.test(rel)) offenders.push(`${path.relative(next, t)} → ${rel}`)
    }
  }
  ok(offenders.length === 0, `${traces.length} traces reference no private/ or .env file`, offenders.slice(0, 3).join('; '))

  console.log('\n4. Static assets')
  const staticMedia = walk(path.join(next, 'static')).filter((f) => MEDIA.test(f))
  ok(staticMedia.length === 0, 'no photo/video/audio in .next/static', staticMedia.slice(0, 3).join(', '))

  console.log('\n5. Private text not compiled into the build')
  const needles = []
  const letter = path.join(root, 'private', 'text', 'letter.md')
  if (existsSync(letter)) needles.push(readFileSync(letter, 'utf8').split('\n').find((l) => l.trim().length > 25)?.trim())
  const capsule = path.join(root, 'private', 'text', 'capsule.json')
  if (existsSync(capsule)) needles.push(JSON.parse(readFileSync(capsule, 'utf8')).message?.slice(0, 40))
  const list = needles.filter(Boolean)
  if (!list.length) console.log('  – no private text present to search for')
  const builtText = walk(next).filter((f) => /\.(js|html|json|rsc|txt|body)$/.test(f) && !f.includes(`${path.sep}cache${path.sep}`))
  for (const n of list) {
    const hit = builtText.find((f) => readFileSync(f, 'utf8').includes(n))
    ok(!hit, `"${n.slice(0, 30)}…" not in build output`, hit ? path.relative(root, hit) : '')
  }
}

console.log(fail ? `\n${fail} problem(s) found` : '\nAll clear: no private assets in Git, public/ or the build.')
process.exit(fail ? 1 : 0)
