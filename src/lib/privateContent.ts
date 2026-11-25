/**
 * Server-only personal content: letter, time capsule, audio.
 * Lives in private/ (git-ignored, never in public/ or the build trace); served only by session-gated API routes.
 *
 *   private/text/letter.md        final letter (plain text, blank line = new paragraph)
 *   private/text/capsule.json     { "unlockAt": "2027-03-14T00:00:00+01:00", "title": "…", "message": "…", "voice": "capsule.mp3" }
 *   private/audio/music.(mp3|m4a|ogg)            optional licensed music
 *   private/audio/music.placeholder.mp3          generated test tone (used only if no real file)
 *   private/audio/<voice file from capsule.json> optional voice message
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = () => /* turbopackIgnore: true */ process.cwd()
const privateDir = (...p: string[]) => path.join(root(), 'private', ...p)

/** Default draft shown until private/text/letter.md exists. Clearly marked as draft in the UI. */
export const DRAFT_LETTER = `E dashur Nadia,

Sot, në ditën tënde të veçantë, dua të të dhuroj diçka që shkon përtej kohës dhe hapësirës.

Një yll në qiell, që do të mbajë simbolikisht emrin tënd.

Ashtu si ky yll, edhe ti sjell dritë, ngrohtësi dhe energji në jetën e të gjithë atyre që të rrethojnë.

Uroj që të vazhdosh të shkëlqesh gjithmonë, të ndjekësh ëndrrat e tua dhe të jesh po aq e veçantë sa ylli yt në univers.

Gëzuar ditëlindjen, Nadia!`

export function readLetter(): { paragraphs: string[]; draft: boolean } {
  const file = privateDir('text', 'letter.md')
  const text = existsSync(file) ? readFileSync(file, 'utf8') : DRAFT_LETTER
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  return { paragraphs, draft: !existsSync(file) }
}

export type CapsuleConfig = { unlockAt: string; title?: string; message: string; voice?: string }
export type CapsuleView =
  | { configured: false }
  | { configured: true; locked: true; unlockAt: string }
  | { configured: true; locked: false; unlockAt: string; title: string; message: string; hasVoice: boolean }

export function readCapsuleConfig(): CapsuleConfig | null {
  const file = privateDir('text', 'capsule.json')
  if (!existsSync(file)) return null
  try {
    const cfg = JSON.parse(readFileSync(file, 'utf8')) as CapsuleConfig
    if (!cfg.unlockAt || Number.isNaN(Date.parse(cfg.unlockAt)) || typeof cfg.message !== 'string') return null
    return cfg
  } catch {
    return null
  }
}

/**
 * The server decides — the message is never sent before unlockAt (server clock).
 * This protects against the recipient opening it early in the browser; it is not a cryptographic seal
 * (anyone with access to the server or the private/ folder can read it).
 */
export function capsuleView(cfg: CapsuleConfig | null, now = new Date()): CapsuleView {
  if (!cfg) return { configured: false }
  const unlockAt = new Date(cfg.unlockAt).toISOString()
  if (now.getTime() < Date.parse(cfg.unlockAt)) return { configured: true, locked: true, unlockAt }
  return {
    configured: true,
    locked: false,
    unlockAt,
    title: cfg.title ?? 'Kapsula e kohës',
    message: cfg.message,
    hasVoice: Boolean(cfg.voice && resolveAudioFile(cfg.voice)),
  }
}

const AUDIO_MIME: Record<string, string> = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.wav': 'audio/wav' }

function resolveAudioFile(name: string): { file: string; mime: string } | null {
  if (!/^[\w.-]+$/.test(name) || name.startsWith('.')) return null
  const dir = privateDir('audio')
  const file = path.resolve(dir, name)
  const rel = path.relative(dir, file)
  const mime = AUDIO_MIME[path.extname(name).toLowerCase()]
  if (!mime || rel.startsWith('..') || path.isAbsolute(rel) || !existsSync(file)) return null
  return { file, mime }
}

/** Music: a real licensed file wins over the generated placeholder. */
export function resolveMusic(): { file: string; mime: string; placeholder: boolean } | null {
  const dir = privateDir('audio')
  if (!existsSync(dir)) return null
  const files = readdirSync(dir)
  const real = files.find((f) => /^music\.(mp3|m4a|aac|ogg|wav)$/i.test(f))
  const fallback = files.find((f) => /^music\.placeholder\.(mp3|m4a|ogg)$/i.test(f))
  const pick = real ?? fallback
  const r = pick ? resolveAudioFile(pick) : null
  return r ? { ...r, placeholder: !real } : null
}

/** Capsule voice — only once the capsule is unlocked. */
export function resolveCapsuleVoice(now = new Date()): { file: string; mime: string } | null {
  const cfg = readCapsuleConfig()
  const view = capsuleView(cfg, now)
  if (!cfg?.voice || !view.configured || view.locked) return null
  return resolveAudioFile(cfg.voice)
}
