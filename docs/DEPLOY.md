# Publikimi dhe ruajtja private (M5 → M7)

> **Asgjë nga këto nuk bëhet pa aprovimin tënd** (CLAUDE.md). Llogaritë dhe çelësat i krijon ti;
> çelësat shkojnë vetëm te variablat e mjedisit të Vercel / `.env.production.local`, **kurrë në chat apo në Git**.

## Pse duhet ruajtje online

Dosja `private/` ekziston vetëm në kompjuterin tënd dhe nuk ngarkohet në Git apo në Vercel.
Në prodhim, fotot, letra, kapsula dhe audio lexohen nga një **bucket privat S3** (R2 / S3 / B2). Bucket-i lexohet
vetëm nga serveri, me kërkesa të nënshkruara dhe pas kontrollit të sesionit. Asnjë objekt nuk ka link publik.

## Shërbimet (të gjitha kanë plan falas që mjafton)

| Për çfarë | Rekomandimi | Alternativa |
| --- | --- | --- |
| Hostimi | Vercel (Hobby) | çdo host Node.js |
| Ruajtja private | **Cloudflare R2**: 10 GB falas, pa kosto shkarkimi | AWS S3, Backblaze B2 |
| Kufizimi i provave të kodit | **Upstash Redis** (nga Vercel Marketplace ose upstash.com) | — |

## Variablat e mjedisit (Vercel → Settings → Environment Variables, vetëm "Production")

| Variabla | Vlera |
| --- | --- |
| `ACCESS_CODE_HASH` | nga `npm run hash-code -- "kodi-final"` (kod i fortë, **jo** ditëlindja) |
| `SESSION_SECRET` | nga e njëjta komandë (≥ 32 bajte të rastësishëm) |
| `SESSION_TTL_HOURS` | p.sh. `12` |
| `STORAGE_DRIVER` | `s3` |
| `S3_ENDPOINT` | R2: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | p.sh. `nadia-private` |
| `S3_REGION` | R2: `auto` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | token R2 me leje **Object Read** vetëm për këtë bucket |
| `S3_PREFIX` | opsionale, p.sh. `v1` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | nga Upstash (ose `KV_REST_API_URL` / `KV_REST_API_TOKEN` nga Vercel) |

Pa Redis, kufizuesi bie në memorie, gjë që **nuk mjafton në serverless** (çdo instancë numëron veçmas). Në prodhim Redis është i detyrueshëm.

## Hapat (M7, pas aprovimit)

1. **Bucket-i R2:** Cloudflare → R2 → Create bucket `nadia-private`. **Mos** aktivizo "Public access" apo `r2.dev`.
   Krijo dy token API: një me *Object Read & Write* (vetëm për ngarkim, mbetet te kompjuteri yt) dhe një me *Object Read* (për Vercel).
2. **Përgatit përmbajtjen lokalisht:** fotot te `private/gallery/` → `npm run gallery:prepare`; letra te `private/text/letter.md`;
   kapsula te `private/text/capsule.json`; muzika/zëri te `private/audio/`.
3. **Ngarko:** krijo `.env.production.local` (në Git është i injoruar) me `S3_*` dhe tokenin *Read & Write*, pastaj:
   ```bash
   npm run private:upload            # provë: liston çfarë do të ngarkohej
   npm run private:upload -- --yes   # ngarkon
   ```
4. **Vercel:** importo repo-n, vendos variablat e mësipërme dhe bëj deploy.
5. **Verifiko faqen online:**
   ```bash
   BASE_URL=https://<adresa> ACCESS_CODE=… npm run test:access -- --skip-bruteforce
   ```
   (`--skip-bruteforce`, që të mos bllokohet IP-ja jote për 15 minuta. Bllokimi kontrollohet lokalisht dhe me teste unit.)
6. Testi në iPhone me HTTPS (lista më poshtë) dhe QR-ja në PDF-të.

## Kontrollet që duhen kaluar para çdo publikimi

```bash
npm run check          # lint + typecheck + 36 teste + build + audit:private
npm run start -- -p 3100
BASE_URL=http://localhost:3100 ACCESS_CODE=… SESSION_SECRET=… npm run test:access
```

## Testi në iPhone (Safari)

**A. Tani, në rrjetin lokal (versioni dev).** Build-i i prodhimit kërkon HTTPS për cookie-n, kështu që përmes Wi-Fi përdoret dev.
1. Telefoni dhe kompjuteri në të njëjtin Wi-Fi. Gjej IP-në e kompjuterit: `ipconfig` → "IPv4 Address" (p.sh. 192.168.1.20).
2. Nise serverin (në PowerShell):
   ```powershell
   $env:NADIA_LAN_HOST="192.168.1.20"; npm run dev -- -H 0.0.0.0
   ```
   Nëse Windows pyet për Firewall, lejo "Private networks".
3. Në iPhone hap `http://192.168.1.20:3000` dhe fut kodin lokal (te `.env.local`).

**B. Në M7, me HTTPS (testi përfundimtar),** në adresën e Vercel.

**Lista e kontrollit** (shëno ✓/✗ dhe dërgo screenshot nëse diçka nuk shkon):
- [ ] Hyrja me kod; kodi i gabuar jep mesazh në shqip
- [ ] Zarfi hapet; "Fillo udhëtimin" nis udhëtimin 3D pa ngrirje
- [ ] "Kalo" funksionon; zbulimi i yllit lexohet mirë
- [ ] Galeria 3D: rrëshqitja me gisht lëviz kamerën; prekja hap foton; ←/→ me rrëshqitje në shikues; "Mbyll"
- [ ] Videoja luan vetëm kur shtyp ▶
- [ ] Harta: lëvizja me një gisht, zmadhimi me dy gishta, butonat
- [ ] Letra, kapsula, certifikata lexohen mirë; "Hap për printim" → "Ndaj → Printo"
- [ ] "♪ Muzika" fillon vetëm me prekje dhe nuk ndalet kur ndërron kapitullin
- [ ] Me "Reduce Motion" (Cilësimet → Accessibility → Motion) udhëtimi kalohet dhe galeria hapet në 2D
- [ ] "Dil" → kthehet te hyrja; butoni "Back" nuk tregon përmbajtje private
