# Manifesti i aseteve

Statusi: **P** = placeholder i etiketuar · **G** = gati · **M** = mungon (duhet nga dhuruesi)

| Aseti | Ku përdoret | Statusi | Burimi / licenca | Vendndodhja |
| --- | --- | --- | --- | --- |
| Mockup i aprovuar | referencë vizuale | G | i dhënë nga dhuruesi | `assets/approved-mockup.png` |
| Fonti display — Cormorant Garamond | tituj, emri | G | SIL OFL 1.1 (Google Fonts, self-hosted nga `next/font`) | build |
| Fonti UI — Jost | tekst UI | G | SIL OFL 1.1 | build |
| Toka, yjet, mjegullnajat, Regulus | udhëtimi 3D | G (procedural) | kod origjinal GLSL, pa tekstura | `src/components/JourneyScene.tsx` |
| Qielli 2D (fallback) | pa WebGL / reduced motion | G (procedural) | kod origjinal SVG | `src/components/StaticSky.tsx` |
| Vula e artë / emblema | zarfi, hyrja | G | SVG origjinal | `src/components/Emblem.tsx` |
| 12 foto + 1 video PLACEHOLDER | M3 galeria (testim) | P — etiketa "Placeholder" në çdo kujtim | gjeneruar nga `npm run gallery:placeholders` (sharp + ffmpeg) | `private/placeholders/` (jashtë Git) |
| 10–20 foto origjinale | M3 galeria | M | dhuruesi | `private/gallery/` → `npm run gallery:prepare` |
| Video të shkurtra (opsionale) | M3 galeria | M | dhuruesi | `private/gallery/` |
| Muzikë e licencuar (opsionale) | M4 audio | P: tingull prove i gjeneruar (`music.placeholder.mp3`), shënuar "provë" | dhuruesi + leja | `private/audio/music.mp3` |
| Mesazh zanor (opsional) | M4 kapsula | P: tingull prove | dhuruesi | `private/audio/` + `capsule.json` |
| Teksti final i letrës | M4 / M6 | P: draft i etiketuar, bazuar në mockup | dhuruesi | `private/text/letter.md` |
| Teksti i kartës A6 | M6 | M | dhuruesi | — |
| Kapsula e kohës (teksti + data) | M4 | P: shembull i kyçur deri më 14.03.2027 | dhuruesi | `private/text/capsule.json` |
| 175 yje rreth Luanit | M4 harta | G | SIMBAD TAP, 2026-11-25 (me mirënjohje) | `src/data/sky-region.json` |
| Klipe Kling/Higgsfield (opsionale) | tranzicione | M (jo të nevojshme) | dhuruesi | `private/video/` |
| Vlerat astronomike të Regulus | zbulimi, certifikata, harta | G, verifikuar me SIMBAD më 2026-11-25 (shih docs/ASTRONOMY.md) | SIMBAD | `src/lib/astronomy.ts` |
| Data e dedikimit, emri i dhuruesit | certifikata, letra | M | dhuruesi | `config/dedication.json` |
| URL publike / QR | certifikata, PDF | M (pas aprovimit të deploy-it) | — | `config/dedication.json` |
