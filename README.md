# NADIA

Dhuratë private ditëlindjeje: yll simbolik (Regulus, α Leonis) + website interaktiv + paketë printimi.
Specifikimi: [docs/SPEC.md](docs/SPEC.md) · Milestone-t: [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md) · Rregullat: [CLAUDE.md](CLAUDE.md) · Raporti aktual: [docs/MILESTONE-REPORT.md](docs/MILESTONE-REPORT.md)

> Dedikim simbolik dhe privat — **nuk** është emërtim zyrtar astronomik.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Three.js + React Three Fiber · ESLint · Vitest.
Versionet janë të fiksuara në `package.json` dhe `package-lock.json`.

## Nisja lokale

Kërkon Node.js ≥ 20.9.

```bash
npm install
npm run hash-code -- "nje-kod-i-forte-privat"   # printon ACCESS_CODE_HASH dhe SESSION_SECRET
# kopjo .env.example → .env.local dhe vendos dy vlerat e printuara
npm run dev                                       # http://localhost:3000
```

| Komanda | Çfarë bën |
| --- | --- |
| `npm run dev` | Server zhvillimi |
| `npm run build` / `npm start` | Build prodhimi / nisja e tij |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Teste unit (Vitest) |
| `npm run check` | Të gjitha sa më sipër |

## Struktura

```
assets/approved-mockup.png   referenca vizuale e aprovuar (mos e ndrysho)
config/dedication.json       të dhënat e dedikimit (marrësi, ID private, flamujt e verifikimit)
docs/                        specifikimi, milestone-t, inputet, manifesti i aseteve, raporti
private/                     asetet personale — VETËM lokalisht, jashtë Git
scripts/hash-code.mjs        gjeneron hash-in e kodit të hyrjes
src/proxy.ts                 porta e sesionit para /experience dhe /api/private/*
src/app/                     faqet: / (hyrja), /experience; API: /api/auth/login|logout
src/components/              AccessGate, Envelope, Experience, JourneyScene (3D), StaticSky (fallback)
src/lib/                     auth (PBKDF2 + HMAC), rateLimit, dedication, astronomy
tests/                       teste unit
```

## Privatësia dhe siguria

- Kodi i hyrjes ruhet vetëm si hash PBKDF2-SHA256 në variabël mjedisi; kurrë në kod apo Git.
- Sesioni: cookie `HttpOnly`, `SameSite=Strict`, `Secure` në prodhim, i nënshkruar me HMAC dhe me skadim.
- Kufizim përpjekjesh: 5 në 15 min për IP + kufi global (në memorie — shih M5 për prodhim).
- `X-Robots-Tag: noindex`, `Cache-Control: no-store` në faqet private dhe API.
- Fotot/videot/zëri/teksti final shkojnë në `private/` (i injoruar nga Git), jo në `public/`.

## Statusi

M1 dhe M2 janë implementuar (shih raportin). Asnjë deploy nuk bëhet pa aprovim.
