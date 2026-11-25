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
| Muzikë e licencuar (opsionale) | M4 audio | M | dhuruesi + leja | `private/audio/` |
| Mesazh zanor (opsional) | M4 kapsula | M | dhuruesi | `private/audio/` |
| Teksti final i letrës dhe kartës | M4 / M6 | M (Claude mund të hartojë draft) | dhuruesi | `private/text/` |
| Klipe Kling/Higgsfield (opsionale) | tranzicione | M (jo të nevojshme) | dhuruesi | `private/video/` |
| Vlerat astronomike të Regulus | zbulimi, certifikata | P — "Vlera paraprake · në verifikim" | SPEC; verifikim me SIMBAD në M4 | `src/lib/astronomy.ts` |
| Data e dedikimit, emri i dhuruesit | certifikata, letra | M | dhuruesi | `config/dedication.json` |
| URL publike / QR | certifikata, PDF | M (pas aprovimit të deploy-it) | — | `config/dedication.json` |
