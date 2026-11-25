# Raporti i milestone-ve

## M1 — Skeleti · ✅ i implementuar

- Next.js 16 App Router + TypeScript + R3F, varësi të fiksuara (`package-lock.json`).
- Design tokens (midnight `#030611`, navy `#0C1832`, ivory `#F6EDDB`, gold `#C9AC79`) në `src/app/globals.css`;
  fonte OFL me `latin-ext` për ë/ç; film grain statik.
- Layout mobile-first; kontrolluar në 375×812 dhe desktop.
- Manifesti i aseteve: `docs/ASSET-MANIFEST.md`; të dhënat placeholder në `config/dedication.json` dhe `src/lib/astronomy.ts`
  (të etiketuara "Vlera paraprake · në verifikim").
- Hyrja private (SPEC §1) është implementuar që tani sepse çdo faqe tjetër varet prej saj: kodi verifikohet në server,
  sesion HMAC në cookie HttpOnly, kufizim përpjekjesh.

## M2 — Zarfi, udhëtimi, zbulimi · ✅ i implementuar (në pritje të aprovimit)

- Zarf ivory me vulë të artë → "Fillo udhëtimin" (asnjë zë automatik).
- Udhëtim 3D Toka → Regulus (~16 s): Tokë procedurale me atmosferë, ~9000 yje (5000 në celular), 7 mjegullnaja
  me thellësi, yll bardhë-blu natyral me "spikes" të përmbajtura. Etiketa: "Vizualizim artistik — jo udhëtim në shkallë reale."
- Zbulimi: emri NADIA, faktet (distanca, magnituda, RA/Dec J2000, ditëlindja, ID private), shënimi "nuk është emërtim zyrtar".
- Finalja: kamera tërhiqet, "Në univers ka miliarda yje, por ky është i yti.", "Gëzuar ditëlindjen, Nadia!",
  përsërit / kthehu te ylli / te zarfi.
- "Kalo" + Escape për të kaluar udhëtimin; reduced motion → direkt te zbulimi pa lëvizje kamere;
  pa WebGL ose me humbje konteksti → qiell statik 2D.
- DPR i kufizuar [1, 1.75], skena 3D lazy-loaded vetëm në klient, materialet/gjeometritë lirohen në unmount.

### Komandat dhe rezultatet (2026-11-25, Windows 11, Node 24.11.1)

| Komanda | Rezultati |
| --- | --- |
| `npm run lint` | ✅ 0 gabime |
| `npm run typecheck` | ✅ |
| `npm test` | ✅ 3 skedarë, 12 teste |
| `npm run build` | ✅ |

Teste manuale me `curl` kundër `npm run dev`:

| Rasti | Rezultati |
| --- | --- |
| `/experience` pa cookie | 307 → `/` |
| `/api/private/*` pa cookie | 401 JSON |
| Cookie i falsifikuar | 307 → `/` |
| 6 kode të gabuara nga e njëjta IP | 401 ×5, pastaj 429 me `Retry-After: 900` |
| Kodi i saktë | 200 + cookie `HttpOnly; SameSite=Strict` |
| Header-at | `X-Robots-Tag: noindex…`, `Cache-Control: no-store`, `X-Frame-Options: DENY` |

Kontroll vizual në shfletuesin e integruar (Chromium) në desktop dhe 375×812: hyrja, zarfi i mbyllur/hapur,
udhëtimi (Toka, mjegullnajat, afrimi te ylli), zbulimi, finalja.

### Kufizime / çfarë NUK është verifikuar ende

- **Safari në iPhone nuk është testuar** (vetëm emulim viewport në Chromium) — kërkohet në M5.
- Fallback-u pa WebGL dhe reduced motion janë implementuar, por nuk janë provuar me emulim në shfletues.
- Kufizuesi i përpjekjeve është në memorie: në Vercel (serverless) duhet store i përbashkët (M5).
  `X-Forwarded-For` besohet — në Vercel e vendos platforma.
- Audio opsionale: butoni do të shtohet në M4 kur të ketë skedar të licencuar.
- Vlerat astronomike janë kandidate nga SPEC, jo të verifikuara.
- Screenshot-et janë marrë vetëm në sesion, nuk janë ruajtur në repo.

## Hapat e ardhshëm

- **M3** — galeria "Yjësia e kujtimeve" me placeholder (pastaj fotot tuaja nga `private/`).
- **M4** — verifikimi me SIMBAD + efemeridë, harta interaktive e qiellit (Luani pa vizatim luani), letra, kapsula, certifikata.
- **M5–M7** — ruajtja private, PDF-të e printimit, deploy vetëm pas aprovimit.

### Vendime personale që duhen para finalizimit (jo bllokuese tani)

Emri i dhuruesit dhe data e dedikimit · teksti final i letrës/kartës · fotot · muzika/zëri (opsionale) ·
teksti dhe data e kapsulës · kodi final i hyrjes · URL-ja e hostimit · kërkesat e printerit (bleed, ngjyra, foil).
