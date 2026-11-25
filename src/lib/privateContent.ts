/**
 * Server-only personal content: letter, time capsule, audio — read from the private store
 * (local private/… in development, a private S3/R2 bucket in production). Served only by session-gated routes.
 *
 *   text/letter.md        final letter (blank line = new paragraph)
 *   text/capsule.json     { "unlockAt": "2027-03-14T00:00:00+01:00", "title": "…", "message": "…", "voice": "capsule.mp3" }
 *   audio/music.(mp3|m4a|ogg)        optional licensed music
 *   audio/music.placeholder.mp3      generated test tone (used only if no real file)
 *   audio/<voice from capsule.json>  optional voice message
 */
import { getStore } from './storage'

/** Default draft shown until text/letter.md exists. Clearly marked as draft in the UI. */
export const DRAFT_LETTER = `E dashur Nadia,

Sot, në ditën tënde të veçantë, dua të të dhuroj diçka që shkon përtej kohës dhe hapësirës.

Një yll në qiell, që do të mbajë simbolikisht emrin tënd.

Ashtu si ky yll, edhe ti sjell dritë, ngrohtësi dhe energji në jetën e të gjithë atyre që të rrethojnë.

Uroj që të vazhdosh të shkëlqesh gjithmonë, të ndjekësh ëndrrat e tua dhe të jesh po aq e veçantë sa ylli yt në univers.

Gëzuar ditëlindjen, Nadia!`

export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export async function readLetter(): Promise<{ paragraphs: string[]; draft: boolean }> {
  const text = await getStore().readText('text/letter.md')
  return { paragraphs: splitParagraphs(text ?? DRAFT_LETTER), draft: text === null }
}

export type CapsuleConfig = { unlockAt: string; title?: string; message: string; voice?: string }
export type CapsuleView =
  | { configured: false }
  | { configured: true; locked: true; unlockAt: string }
  | { configured: true; locked: false; unlockAt: string; title: string; message: string; hasVoice: boolean }

export function parseCapsule(raw: string | null): CapsuleConfig | null {
  if (!raw) return null
  try {
    const cfg = JSON.parse(raw) as CapsuleConfig
    if (!cfg.unlockAt || Number.isNaN(Date.parse(cfg.unlockAt)) || typeof cfg.message !== 'string') return null
    if (cfg.voice !== undefined && !/^[\w][\w.-]*\.(mp3|m4a|aac|ogg|wav)$/i.test(cfg.voice)) delete cfg.voice
    return cfg
  } catch {
    return null
  }
}

export async function readCapsuleConfig(): Promise<CapsuleConfig | null> {
  return parseCapsule(await getStore().readText('text/capsule.json'))
}

/**
 * The server decides — the message is never sent before unlockAt (server clock).
 * This protects against the recipient opening it early in the browser; it is not a cryptographic seal
 * (anyone with access to the server or the private storage can read it).
 */
export function capsuleView(cfg: CapsuleConfig | null, now = new Date(), voiceExists = false): CapsuleView {
  if (!cfg) return { configured: false }
  const unlockAt = new Date(cfg.unlockAt).toISOString()
  if (now.getTime() < Date.parse(cfg.unlockAt)) return { configured: true, locked: true, unlockAt }
  return {
    configured: true,
    locked: false,
    unlockAt,
    title: cfg.title ?? 'Kapsula e kohës',
    message: cfg.message,
    hasVoice: Boolean(cfg.voice) && voiceExists,
  }
}

export async function currentCapsuleView(now = new Date()): Promise<CapsuleView> {
  const cfg = await readCapsuleConfig()
  const voiceExists = cfg?.voice ? (await getStore().size(`audio/${cfg.voice}`)) !== null : false
  return capsuleView(cfg, now, voiceExists)
}

const AUDIO_MIME: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', wav: 'audio/wav' }
const mimeOf = (key: string) => AUDIO_MIME[key.split('.').pop()!.toLowerCase()] ?? null

/** Music: a real licensed file wins over the generated placeholder. */
export async function resolveMusic(): Promise<{ key: string; mime: string; placeholder: boolean } | null> {
  const keys = await getStore().list('audio/')
  const real = keys.find((k) => /^audio\/music\.(mp3|m4a|aac|ogg|wav)$/i.test(k))
  const fallback = keys.find((k) => /^audio\/music\.placeholder\.(mp3|m4a|ogg)$/i.test(k))
  const key = real ?? fallback
  const mime = key ? mimeOf(key) : null
  return key && mime ? { key, mime, placeholder: !real } : null
}

/** Capsule voice — only once the capsule is unlocked (server clock). */
export async function resolveCapsuleVoice(now = new Date()): Promise<{ key: string; mime: string } | null> {
  const cfg = await readCapsuleConfig()
  if (!cfg?.voice || now.getTime() < Date.parse(cfg.unlockAt)) return null
  const key = `audio/${cfg.voice}`
  const mime = mimeOf(key)
  return mime ? { key, mime } : null
}
