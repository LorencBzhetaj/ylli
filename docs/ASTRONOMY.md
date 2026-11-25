# Astronomia — verifikimi dhe supozimet

Verifikuar më **2026-11-25** (M4).

## Regulus (α Leonis) — SIMBAD

Burimi: <https://simbad.harvard.edu/simbad/sim-id?Ident=alf+Leo>, pasqyra zyrtare e SIMBAD (CDS, Strasbourg).
Faqja kryesore <https://simbad.cds.unistra.fr/simbad/sim-id?Ident=alf+Leo> nuk u arrit dot nga mjedisi i punës (DNS).

| Vlera | SIMBAD | Kandidati te SPEC | Çfarë përdoret |
| --- | --- | --- | --- |
| RA (ICRS, ep. J2000) | 10 08 22.31099 | 10h08m22s | **10h 08m 22.3s** ✅ |
| Dec (ICRS, ep. J2000) | +11 58 01.9516 | +11°58′02″ | **+11° 58′ 02″** ✅ |
| Referenca e koordinatave | 2007A&A...474..653V (Hipparcos, van Leeuwen 2007) | — | — |
| Paralaksa | 41.13 ± 0.35 mas (2007A&A...474..653V) | — | — |
| Distanca | 1000 / 41.13 = 24.31 pc = **79.3 ± 0.7 vite-dritë** | ~79 | **≈ 79 vite-dritë** ✅ |
| Magnituda V | **1.40 ± 0.05** (2009ApJ...694.1085V) | ~1.35 | **1.40** ⚠️ e korrigjuar |
| Lëvizja e duhur | μα·cosδ −248.73, μδ +5.59 mas/vit | — | përdoret në llogaritje |
| Tipi spektral | **B8IVn** (2024A&A...690A.176N) | mockup-i: "B7 V" | ⚠️ për portretin në M6 |

**Shënime:**
- Shpesh citohet 1.35, nga katalogu Hipparcos/Bright Star. SIMBAD jep 1.40 nga një burim më i ri. Përdorim vlerën e SIMBAD.
- Mockup-i i portretit shkruan "B7 V, ≈ 12,000 K, ≈ 4.2 × diametri i Diellit, ≈ 288 × shkëlqimi". Këto vlera **nuk janë verifikuar ende**.
  Tipi spektral sipas SIMBAD është B8IVn. Para PDF-ve të M6, temperatura, rrezja dhe shkëlqimi duhet të kontrollohen me një burim
  të cituar (p.sh. studimet interferometrike të Regulus).

## Harta e qiellit

- 175 yje me V < 5.2 në RA 115°–200°, Dec −20°…+45°, nga **SIMBAD TAP**
  (`SELECT main_id, ra, dec, V FROM basic JOIN allfluxes WHERE V < 5.2 AND …`), marrë më 2026-11-25.
  Ruajtur te `src/data/sky-region.json`, me burimin dhe datën. Komponentët e dyfishtë të yjeve të dyfishta janë hequr.
- Projeksion stereografik me qendër RA 160°, Dec +14°; veriu lart, **lindja majtas** (si kur sheh qiellin drejt jugut).
- Vijat e arta janë figura e zakonshme e Luanit (drapëri + trekëndëshi Zosma–Chertan–Denebola). **Pa vizatim luani.**
- Madhësitë dhe ngjyrat e pikave janë ilustruese, kurse pozicionet janë reale.
- Mirënjohje: *This research has made use of the SIMBAD database, operated at CDS, Strasbourg, France.*

## Llogaritjet e vëzhgimit (Tiranë)

- Vendi: Tiranë, 41.3275° V, 19.8187° L, zona kohore **Europe/Tirane** (CET/CEST, me ndërrim automatik).
- Algoritmet (`src/lib/sky.ts`) vijnë nga **J. Meeus, *Astronomical Algorithms*, bot. 2 (1998)**: Dita Juliane (kap. 7),
  koha siderale (kap. 12), koordinatat horizontale (kap. 13), precesioni rigoroz + lëvizja e duhur (kap. 21), Dielli me saktësi të ulët (kap. 25).
- **Verifikimi kundër efemeridës referuese:** `tests/sky.test.ts` riprodhon shembujt e zgjidhur të Meeus 12.a, 12.b, 13.b,
  21.b dhe 25.a brenda 1″ (precesioni) dhe 0.01° (Dielli, lartësi/azimut).
- Kontroll i pavarur: më 14.03.2026 Regulus kalon drejt jugut rreth orës 22:15, në lartësi 60.6°. Kjo përputhet me
  gjeometrinë 90° − φ + δ = 90 − 41.33 + 11.94.
- Lindja/perëndimi llogariten me horizontin standard −0.5667° (përfshin përthyerjen mesatare). Nuk modelohen nutacioni dhe
  aberracioni (< 0.01°), as relievi lokal.
- "Koha më e mirë" do të thotë Regulus ≥ 10° mbi horizont dhe Dielli ≤ −12° (errësirë nautike).

## Çfarë NUK pretendojmë

- **Asnjë emërtim zyrtar.** Kudo shkruhet "dedikim simbolik privat". Certifikata përmend IAU-në dhe SIMBAD-in.
- **Asnjë "qiell i lindjes".** Ora e lindjes nuk dihet. Nëse shtohet një pamje e qiellit të 14.03.2006, do të jetë e etiketuar si
  ilustruese, me orë lokale të zgjedhur nga dhuruesi (në pritje të vendimit).
- Udhëtimi 3D dhe portreti i yllit janë **vizualizime artistike**. Harta përdor pozicione reale.
