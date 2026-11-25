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

## M3 — Galeria "Yjësia e kujtimeve" · ✅ e implementuar me placeholder (në pritje të fotove origjinale)

- Rrjedha: zbulimi → **Kujtimet** → finalja (nga finalja mund të kthehesh te kujtimet ose te ylli).
- **3D**: fotot qëndrojnë si plane në thellësi të ndryshme, të lidhura me vija të holla ari; kamera lëviz me
  rrotë, me tërheqje me gisht, me butonat ‹ › dhe me shigjetat/Home/End; pasi ndalon, kamera ndalet te kujtimi më i afërt.
  Kujtimet që kamera i ka kaluar zbehen. Teksturat ngarkohen vetëm për ±3 kujtime (±2 në celular) dhe lirohen kur largohen.
  Vetëm një kontekst WebGL në një kohë (skena e udhëtimit lirohet kur hapet galeria).
- **Shikuesi** (lightbox): `role="dialog"`, fokusi te "Mbyll", fokusi i bllokuar brenda, Esc mbyll dhe e kthen fokusin,
  ←/→ dhe rrëshqitje me gisht për të mëparshmin/të radhësin, numëruesi, përshkrimi, ngarkimi paraprak i fqinjëve.
  Videot: `controls`, `playsInline`, `preload="metadata"`, kurrë autoplay.
- **2D fallback**: rrjet me fotot në përmasat e tyre, me renditje sipas rreshtave; aktivizohet automatikisht pa WebGL ose
  me reduced motion, dhe me butonin "Pamje 2D / 3D".
- **Pipeline**: `npm run gallery:prepare` (sharp) → kopje WebP 720 px / 2048 px, orientimi EXIF, pa shtrembërim;
  indeksi `private/<dir>/.cache/index.json`. Placeholder-at: `npm run gallery:placeholders` (12 foto me përmasa
  të ndryshme + 1 video 4 s me ffmpeg), secili i etiketuar "Placeholder".
- **Privatësia**: lista vjen nga `/api/private/gallery` dhe mediat nga `/api/private/media/<id>/<thumb|full|video>`,
  vetëm pas hyrjes (proxy + kontroll i dytë në route), `Cache-Control: no-store`. Klienti nuk sheh emra skedarësh;
  ID-të kontrollohen me regex dhe rruga verifikohet që të mos dalë nga dosja `.cache`. Video me HTTP Range (206/416).
- **Build**: u zbulua që leximi dinamik i skedarëve bënte që Turbopack të gjurmonte gjithë projektin, duke përfshirë
  `private/`. Rregulluar me `turbopackIgnore` + `outputFileTracingExcludes` (`private/`, `.env*`, `docs/`, `assets/`…);
  kontrolluar në `*.nft.json`: asnjë skedar privat në bundle. Turbopack ende jep paralajmërimin për gjurmimin e kodit burimor (i padëmshëm).

### Rezultatet (2026-11-25)

| Komanda | Rezultati |
| --- | --- |
| `npm run lint` | ✅ 0 gabime |
| `npm run typecheck` | ✅ |
| `npm test` | ✅ 4 skedarë, 18 teste (shtuar: indeksi, rrugët e mediave, traversal, Range) |
| `npm run build` | ✅ (1 paralajmërim, shih më sipër) |

Teste manuale me `curl`: lista dhe mediat pa sesion → 401; ID e panjohur / traversal (`..%2F`) / variant i gabuar → 404;
`Range: bytes=0-999` → 206 me `Content-Range`; range jashtë skedarit → 416.

Kontroll në shfletuesin e integruar (Chromium), desktop dhe 375×812: 3D me tekstura, navigim me butona dhe rrotë,
hapja e videos (nuk luan vetë), ←/→ në shikues, Esc + kthimi i fokusit, sinkronizimi 3D pas shikuesit, pamja 2D
(13/13 foto të ngarkuara), kalimi galeri → finale.

Gabime të gjetura dhe të rregulluara gjatë testimit: humbja e qëllimshme e kontekstit WebGL nga R3F kur mbyllej skena
çaktivizonte 3D-në; teksturat dilnin të zeza (materiali ripërdorej pa rikompilim); kamera nuk kthehej te kujtimi i
fundit pas kalimit 2D→3D; kujtimi i kaluar mbulonte ekranin në celular.

### Kufizime / çfarë NUK është verifikuar ende

- Nuk është testuar me **fotot origjinale** (s'janë dhënë ende) (HEIC nuk mbështetet: duhet konvertuar në JPG).
- Tërheqja me gisht në 3D dhe rrëshqitja në shikues janë provuar vetëm me logjikë/emulim, jo në një telefon real.
- Safari në iPhone nuk është testuar (M5).
- Lexuesi i ekranit (VoiceOver/NVDA) nuk është provuar; strukturat ARIA janë vendosur, por pa testim me lexues.

## M4 — Astronomia, harta, letra, kapsula, audio, certifikata, finalja · ✅ e implementuar

Rrjedha e plotë sipas SPEC: I zarfi → II udhëtimi → III ylli → IV kujtimet → V harta → VI letra → VII kapsula →
VIII certifikata → IX finalja. Çdo kapitull ka "‹ Mbrapa / Vazhdo ›", dhe finalja ka menunë e të gjithë kapitujve.

- **Astronomia e verifikuar me SIMBAD** (hollësitë te `docs/ASTRONOMY.md`): RA/Dec ✅, distanca 79.3 ± 0.7 vite-dritë ✅,
  **magnituda e korrigjuar 1.35 → 1.40**, tipi spektral B8IVn (mockup-i i portretit thotë "B7 V", ndreqet në M6).
  `astronomyVerified: true`; etiketa "Vlera paraprake" u hoq.
- **Harta interaktive** (`SkyMap`): 175 yje realë nga SIMBAD, figura e Luanit me vija ari (pa luan), Regulus i theksuar,
  emrat kryesorë, konstelacionet fqinje, rrjeti i koordinatave, legjenda, epoka J2000, lindja majtas. Lëvizet me tërheqje,
  zmadhohet me rrotë, me dy gishta ose me +/−, dhe ka butonat "Regulus" e "Gjithë Luani"; me tastierë: shigjetat, +/−, 0.
- **Udhëzuesi për Tiranën** (`ObservingGuide`): për çdo datë jep kohën më të mirë (Regulus ≥ 10°, Dielli ≤ −12°), drejtimin në
  shqip (veri…veriperëndim), lindjen, kalimin në pikën më të lartë dhe perëndimin, plus pozicionin "Tani". Llogaritet në shfletues me algoritmet
  e Meeus, të testuara kundër shembujve të zgjidhur të librit.
- **Letra**: zarf me vulë → letra hapet → paragrafët shfaqen njëri pas tjetrit (pa animacion me reduced motion). Teksti
  vjen nga `private/text/letter.md` përmes `/api/private/letter`. Deri atëherë shfaqet një **draft** i etiketuar, bazuar në mockup.
- **Kapsula e kohës**: `private/text/capsule.json` (data e hapjes, titulli, mesazhi, zëri opsional). **Serveri vendos** dhe nuk e dërgon
  mesazhin para datës (ora e serverit); zëri kthen 404 deri atëherë. UI tregon datën dhe ditët e mbetura. Nuk është vulë
  kriptografike, sepse kush ka qasje në server e lexon. Kjo shkruhet edhe te kodi.
- **Muzika**: butoni "♪ Muzika" te shiriti i sipërm, **kurrë autoplay**. Mbetet aktive kur ndërrohen kapitujt. Përdor
  `private/audio/music.mp3` nëse ekziston, përndryshe një tingull prove të gjeneruar, të shënuar "provë".
- **Certifikata dixhitale**: i njëjti dizajn si mockup-i (fildish, kornizë ari me zbukurime, vulë, tabela me të dhënat,
  ID private, vend për QR). Teksti thotë "**Dedikimi simbolik i një ylli**" dhe "dedikuar simbolikisht", jo "Emërtimi i yllit" apo
  "Regjistri i yjeve" si te mockup-i, që të mos ketë pretendim zyrtar. Ka edhe shënimin e imët për IAU dhe SIMBAD. Faqja
  `/experience/certifikata` jep A4 të saktë për printim / "Ruaj si PDF". Data e dedikimit shfaqet "në pritje".

### Rezultatet (2026-11-25)

| Komanda | Rezultati |
| --- | --- |
| `npm run lint` | ✅ 0 gabime |
| `npm run typecheck` | ✅ |
| `npm test` | ✅ 6 skedarë, 31 teste (shtuar: Meeus 12.a/12.b/13.b/21.b/25.a, zonat kohore, Regulus nga Tirana, kapsula, letra, formulimi i certifikatës) |
| `npm run build` | ✅ |

Me `curl`: `/api/private/letter|capsule|audio|audio/music|audio/capsule` pa sesion → 401; `/experience/certifikata` → 307.
Me sesion: kapsula e kyçur kthen vetëm `unlockAt`; zëri i kapsulës → 404; muzika me Range → 206 `audio/mpeg`; emra skedarësh
të pavlefshëm → 404.

Në shfletuesin e integruar (desktop dhe 375×812): harta (drapëri dhe yjet e Luanit në vend të saktë), udhëzuesi (25.11.2026:
lind 22:45, në pikën më të lartë 05:30 drejt jugut ≈ 61°), letra, kapsula e kyçur (109 ditë), certifikata (kapitulli dhe faqja A4),
finalja me menunë; muzika fillon vetëm me klikim, mbetet aktive kur ndërrohet kapitulli dhe ndalet.

### Kufizime / çfarë NUK është verifikuar ende

- **Printimi / PDF nga shfletuesi nuk është provuar** (mjeti nuk mund të hapë dialogun e printimit). CSS-ja `@page A4` është gati;
  PDF-të përfundimtare janë puna e M6.
- Gjendja "e hapur" e kapsulës është testuar vetëm me teste unit, jo në shfletues (shembulli hapet më 14.03.2027).
- Faqja kryesore e SIMBAD (`simbad.cds.unistra.fr`) nuk u arrit dot; u përdor pasqyra zyrtare `simbad.harvard.edu`.
- Temperatura, rrezja dhe shkëlqimi te mockup-i i portretit nuk janë verifikuar ende (M6).
- Muzika dhe zëri janë tinguj prove; teksti i letrës është draft.

## Hapat e ardhshëm

- **M5** — ruajtja private për prodhim (mediat jashtë serverit lokal), kufizues përpjekjesh me store të përbashkët, teste
  të aksesit për çdo aset, skadimi i sesionit, cache, Safari në iPhone + Chromium desktop.
- **M6** — gjashtë PDF-të e printimit (certifikata, harta, portreti, letra, karta, kopertina), bleed, fontet, korrigjimi i portretit.
- **M7** — aprovimi yt, pastaj deploy, testi i HTTPS dhe QR-së në telefon.

### Vendime personale që duhen para finalizimit (jo bllokuese tani)

Emri i dhuruesit dhe data e dedikimit · teksti final i letrës/kartës · fotot · muzika/zëri (opsionale) ·
teksti dhe data e kapsulës · kodi final i hyrjes · URL-ja e hostimit · kërkesat e printerit (bleed, ngjyra, foil) ·
(opsionale) a duhet një pamje ilustruese e qiellit të 14.03.2006, dhe me çfarë ore lokale.
