#!/usr/bin/env node
/**
 * End-to-end access test for every private route (M5).
 *
 *   BASE_URL=http://localhost:3000 ACCESS_CODE=… npm run test:access
 *   BASE_URL=https://<deploy-url>  ACCESS_CODE=… npm run test:access -- --skip-bruteforce
 *
 * Optional: SESSION_SECRET=… also forges an *expired* but correctly signed token and checks it is refused.
 * The brute-force check sends 6 wrong codes. Locally it uses a fake X-Forwarded-For; on Vercel the platform sets
 * the client IP, so it would lock YOUR IP for 15 minutes → use --skip-bruteforce there (or run it last).
 */
import { webcrypto as crypto } from 'node:crypto'

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const CODE = process.env.ACCESS_CODE
const SECRET = process.env.SESSION_SECRET
const SKIP_BRUTE = process.argv.includes('--skip-bruteforce')
const HTTPS = BASE.startsWith('https://')

let pass = 0
let fail = 0
const ok = (cond, label, extra = '') => {
  if (cond) pass++
  else fail++
  console.log(`${cond ? '  ✓' : '  ✗'} ${label}${extra ? `  — ${extra}` : ''}`)
}
const req = (path, init = {}) => fetch(BASE + path, { redirect: 'manual', ...init })
const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`

const PRIVATE_API = [
  '/api/private/gallery',
  '/api/private/media/m01/thumb',
  '/api/private/media/m01/full',
  '/api/private/media/m05/video',
  '/api/private/letter',
  '/api/private/capsule',
  '/api/private/audio',
  '/api/private/audio/music',
  '/api/private/audio/capsule',
]
const PRIVATE_PAGES = ['/experience', '/experience/certifikata']

async function denied(cookie, label) {
  for (const p of PRIVATE_API) {
    const r = await req(p, cookie ? { headers: { cookie } } : {})
    const body = await r.text()
    ok(r.status === 401 && !/E dashur|Kujtimi|unlockAt|placeholder/i.test(body), `${label}: ${p} → ${r.status}`)
  }
  for (const p of PRIVATE_PAGES) {
    const r = await req(p, cookie ? { headers: { cookie } } : {})
    const loc = r.headers.get('location') || ''
    ok([302, 303, 307, 308].includes(r.status) && new URL(loc, BASE).pathname === '/', `${label}: ${p} → ${r.status} ${loc}`)
  }
}

const b64url = (u8) => Buffer.from(u8).toString('base64url')
async function forgeToken(secret, expMs) {
  const payload = `v1.${expMs}.${b64url(crypto.getRandomValues(new Uint8Array(12)))}`
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${b64url(new Uint8Array(sig))}`
}

async function main() {
  console.log(`\nNADIA access test → ${BASE}\n`)

  console.log('1. Security headers')
  const home = await req('/')
  ok(Boolean(home.headers.get('content-security-policy')), 'Content-Security-Policy present')
  ok(/noindex/.test(home.headers.get('x-robots-tag') || ''), 'X-Robots-Tag noindex')
  ok(/no-store/.test(home.headers.get('cache-control') || ''), 'entry page Cache-Control no-store', home.headers.get('cache-control'))
  ok(home.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options DENY')
  if (HTTPS) ok(/max-age=\d+/.test(home.headers.get('strict-transport-security') || ''), 'HSTS on HTTPS')

  console.log('\n2. No session → every private route refused')
  await denied(null, 'no cookie')

  console.log('\n3. Forged / tampered / expired sessions refused')
  for (const name of ['nadia_session', '__Host-nadia_session']) {
    await denied(`${name}=v1.99999999999999.AAAA.BBBB`, `forged (${name})`)
  }
  if (SECRET) {
    const expired = await forgeToken(SECRET, Date.now() - 60_000)
    for (const name of ['nadia_session', '__Host-nadia_session']) await denied(`${name}=${expired}`, `expired+validly-signed (${name})`)
  } else {
    console.log('  – SESSION_SECRET not given: expired-token check skipped (covered by unit tests)')
  }

  console.log('\n4. Login endpoint')
  const cross = await req('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example', 'x-forwarded-for': fakeIp() }, body: '{"code":"x"}' })
  ok(cross.status === 403, `cross-site Origin → ${cross.status}`)
  if (!SKIP_BRUTE) {
    const ip = fakeIp()
    const statuses = []
    for (let i = 0; i < 6; i++) {
      const r = await req('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify({ code: `wrong-${i}` }) })
      statuses.push(r.status)
      if (r.status === 429) ok(Number(r.headers.get('retry-after')) > 0, 'Retry-After header on 429', r.headers.get('retry-after'))
    }
    ok(statuses.slice(0, 5).every((s) => s === 401) && statuses[5] === 429, `brute force: 5×401 then 429`, statuses.join(','))
  } else console.log('  – brute-force check skipped (--skip-bruteforce)')

  if (!CODE) {
    console.log('\nACCESS_CODE not given: authenticated checks skipped.')
    return
  }

  const login = await req('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': fakeIp() }, body: JSON.stringify({ code: CODE }) })
  const setCookie = login.headers.get('set-cookie') || ''
  ok(login.status === 200, `correct code → ${login.status}`)
  ok(/HttpOnly/i.test(setCookie) && /SameSite=Strict/i.test(setCookie), 'cookie HttpOnly + SameSite=Strict')
  if (HTTPS) ok(/Secure/i.test(setCookie) && /^__Host-/.test(setCookie), 'cookie Secure + __Host- prefix on HTTPS')
  const cookie = setCookie.split(';')[0]
  const auth = { headers: { cookie } }

  console.log('\n5. With session → content, never cached')
  for (const p of PRIVATE_PAGES) {
    const r = await req(p, auth)
    ok(r.status === 200 && /no-store/.test(r.headers.get('cache-control') || ''), `${p} → ${r.status}`, r.headers.get('cache-control'))
  }
  const gal = await req('/api/private/gallery', auth)
  const g = await gal.json()
  ok(gal.status === 200 && Array.isArray(g.items), `gallery list → ${gal.status}, ${g.items?.length ?? 0} items`)
  // URLs under /api/private/ are expected; anything else that looks like a file name or a private/ path is a leak.
  ok(!JSON.stringify(g).replace(/\/api\/private\//g, '/api/').match(/\.webp|\.mp4|\.jpg|private\//), 'gallery list exposes no file names or paths')
  let mediaOk = 0
  for (const it of g.items ?? []) {
    for (const u of [it.thumb, it.full, it.video].filter(Boolean)) {
      const r = await req(u, { headers: { cookie, range: 'bytes=0-15' } })
      if ([200, 206].includes(r.status) && /no-store/.test(r.headers.get('cache-control') || '')) mediaOk++
      else ok(false, `media ${u} → ${r.status}`)
      await r.arrayBuffer()
      const anon = await req(u)
      if (anon.status !== 401) ok(false, `media ${u} without session → ${anon.status}`)
    }
  }
  ok(mediaOk > 0, `${mediaOk} media URLs served with session (Range ok, no-store) and refused without`)
  for (const p of ['/api/private/letter', '/api/private/capsule', '/api/private/audio']) {
    const r = await req(p, auth)
    ok(r.status === 200 && /no-store/.test(r.headers.get('cache-control') || ''), `${p} → ${r.status}`)
    if (p.endsWith('capsule')) {
      const c = await r.json()
      if (c.locked) ok(!('message' in c), 'locked capsule response contains no message')
      if (c.locked) ok((await req('/api/private/audio/capsule', auth)).status === 404, 'capsule voice withheld while locked')
    }
  }
  const bad = await req('/api/private/media/..%2F..%2F.env.local/full', auth)
  ok(bad.status === 404, `path traversal attempt → ${bad.status}`)

  console.log('\n6. Logout')
  const out = await req('/api/auth/logout', { method: 'POST', headers: { cookie } })
  const cleared = out.headers.get('set-cookie') || ''
  ok(out.status === 200 && /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(cleared), 'logout expires the cookie')
  ok(/cache/.test(out.headers.get('clear-site-data') || ''), 'logout sends Clear-Site-Data: "cache"')
}

main()
  .catch((e) => {
    fail++
    console.error('\nERROR', e.message)
  })
  .finally(() => {
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  })
