#!/usr/bin/env node
/**
 * Creates clearly-labelled PLACEHOLDER media in private/placeholders/ (git-ignored),
 * so the gallery can be tested end-to-end before the real photos arrive.
 * Also a 4 s placeholder video if ffmpeg is on PATH (optional dev tool, not a dependency).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import sharp from 'sharp'

const dir = path.join(process.cwd(), 'private', 'placeholders')
mkdirSync(dir, { recursive: true })

// Mixed aspect ratios to prove nothing is ever stretched.
const ratios = [[3, 2], [2, 3], [4, 5], [1, 1], [16, 9], [3, 4], [3, 2], [9, 16], [4, 3], [2, 3], [5, 4], [3, 2]]
const hues = ['#1d3a8a', '#3f2f7a', '#14305f', '#2a3f7c', '#33275e', '#1b4472']

const svg = (w, h, i, hue, label, ratio) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="g" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="${hue}"/><stop offset="1" stop-color="#050a1c"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="${w * 0.04}" y="${w * 0.04}" width="${w * 0.92}" height="${h - w * 0.08}" fill="none" stroke="#c9ac79" stroke-opacity="0.7" stroke-width="${Math.max(2, w * 0.004)}"/>
  <g font-family="Georgia, serif" text-anchor="middle" fill="#f6eddb">
    <text x="50%" y="44%" font-size="${w * 0.05}" letter-spacing="${w * 0.012}" fill="#c9ac79">PLACEHOLDER</text>
    <text x="50%" y="56%" font-size="${w * 0.09}">${label} ${String(i).padStart(2, '0')}</text>
    <text x="50%" y="66%" font-size="${w * 0.032}" fill-opacity="0.75">${w} x ${h}  (${ratio})</text>
  </g>
</svg>`

const items = []
for (let i = 1; i <= ratios.length; i++) {
  const [a, b] = ratios[i - 1]
  const w = a >= b ? 1800 : Math.round((1800 * a) / b)
  const h = a >= b ? Math.round((1800 * b) / a) : 1800
  const file = `${String(i).padStart(2, '0')}.jpg`
  await sharp(Buffer.from(svg(w, h, i, hues[i % hues.length], 'Foto', `${a}:${b}`))).jpeg({ quality: 85 }).toFile(path.join(dir, file))
  items.push({ file, caption: `Kujtimi ${i} — përshkrimi do të shtohet nga dhuruesi`, alt: `Placeholder për foton ${i}`, placeholder: true })
}

if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0) {
  const video = 'video-01.mp4'
  const r = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'gradients=s=1280x720:c0=0x0c1832:c1=0x3f5fb0:speed=0.02:duration=4:rate=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(dir, video)],
    { stdio: 'inherit' },
  )
  if (r.status === 0) {
    await sharp(Buffer.from(svg(1280, 720, 1, '#2a3f7c', 'Video', '16:9'))).jpeg({ quality: 85 }).toFile(path.join(dir, 'video-01-poster.jpg'))
    items.splice(4, 0, { file: video, poster: 'video-01-poster.jpg', caption: 'Video placeholder — klipi yt do të vendoset këtu', alt: 'Placeholder për një video', placeholder: true })
  }
} else {
  console.warn('ffmpeg nuk u gjet: u krijuan vetëm foto placeholder.')
}

writeFileSync(path.join(dir, 'gallery.json'), JSON.stringify({ items }, null, 2))
console.log(`${items.length} placeholder te private/placeholders/`)
