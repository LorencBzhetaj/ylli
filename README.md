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

## Galeria e kujtimeve (fotot dhe videot)

```bash
npm run gallery:placeholders   # krijon 12 foto + 1 video PLACEHOLDER në private/placeholders/ dhe i përgatit
npm run gallery:prepare        # përgatit fotot e vërteta nga private/gallery/ (kur të ekzistojnë)
```

1. Vendos fotot origjinale (JPG/PNG/WebP/AVIF) dhe videot (MP4/WebM/MOV) te `private/gallery/`.
   Fotot HEIC nga iPhone konvertoji më parë në JPG (ose në iPhone: Cilësimet → Kamera → Formatet → "Më e përputhshmja").
2. Opsionale — `private/gallery/gallery.json` për renditjen dhe përshkrimet:
   ```json
   { "items": [
     { "file": "01.jpg", "caption": "Përshkrimi në shqip", "alt": "Çfarë shihet në foto" },
     { "file": "klip.mp4", "poster": "klip.jpg", "caption": "…" }
   ] }
   ```
   Pa këtë skedar, fotot renditen sipas emrit; poster-i i një videoje është fotoja me të njëjtin emër.
3. `npm run gallery:prepare` — krijon kopje të optimizuara (720 px për 3D, 2048 px për shikuesin) te
   `private/gallery/.cache/`. Origjinalet nuk preken, përmasat ruhen (asnjë foto nuk shtrembërohet).

Sapo `private/gallery/.cache/` ekziston, faqja përdor fotot e vërteta në vend të placeholder-ave.
Mediat shërbehen vetëm nga `/api/private/media/…` pas hyrjes, kurrë nga `public/`.

## Struktura

```
assets/approved-mockup.png   referenca vizuale e aprovuar (mos e ndrysho)
config/dedication.json       të dhënat e dedikimit (marrësi, ID private, flamujt e verifikimit)
docs/                        specifikimi, milestone-t, inputet, manifesti i aseteve, raporti
private/                     asetet personale — VETËM lokalisht, jashtë Git
scripts/                     hash-code, make-placeholders, prepare-gallery
src/proxy.ts                 porta e sesionit para /experience dhe /api/private/*
src/app/                     faqet: / (hyrja), /experience; API: /api/auth/*, /api/private/gallery, /api/private/media/*
src/components/              AccessGate, Envelope, Experience, JourneyScene (3D), StaticSky (fallback)
src/components/gallery/      Gallery, MemoryConstellation (3D), Gallery2D (fallback), Lightbox (shikuesi)
src/lib/                     auth (PBKDF2 + HMAC), rateLimit, dedication, astronomy, gallery
tests/                       teste unit
```

## Privatësia dhe siguria

- Kodi i hyrjes ruhet vetëm si hash PBKDF2-SHA256 në variabël mjedisi; kurrë në kod apo Git.
- Sesioni: cookie `HttpOnly`, `SameSite=Strict`, `Secure` në prodhim, i nënshkruar me HMAC dhe me skadim.
- Kufizim përpjekjesh: 5 në 15 min për IP + kufi global (në memorie — shih M5 për prodhim).
- `X-Robots-Tag: noindex`, `Cache-Control: no-store` në faqet private dhe API.
- Fotot/videot/zëri/teksti final shkojnë në `private/` (i injoruar nga Git), jo në `public/`.

## Statusi

M1, M2 dhe M3 janë implementuar (shih raportin). Asnjë deploy nuk bëhet pa aprovim.
