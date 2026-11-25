#!/usr/bin/env node
// Gjeneron ACCESS_CODE_HASH dhe një SESSION_SECRET të rastësishëm.
// Përdorimi:  npm run hash-code -- "kodi-yt-i-forte"
import { webcrypto as crypto } from 'node:crypto'

const code = process.argv[2]
if (!code || code.trim().length < 10) {
  console.error('Jep një kod të fortë (të paktën 10 karaktere):  npm run hash-code -- "kodi-yt"')
  process.exit(1)
}
const b64url = (u8) => Buffer.from(u8).toString('base64url')
const iterations = 210000
const salt = crypto.getRandomValues(new Uint8Array(16))
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(code.normalize('NFC').trim()), 'PBKDF2', false, ['deriveBits'])
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
console.log('# Shto këto rreshta në .env.local (mos i fut në Git):')
console.log(`ACCESS_CODE_HASH=pbkdf2-sha256:${iterations}:${b64url(salt)}:${b64url(new Uint8Array(bits))}`)
console.log(`SESSION_SECRET=${b64url(crypto.getRandomValues(new Uint8Array(32)))}`)
