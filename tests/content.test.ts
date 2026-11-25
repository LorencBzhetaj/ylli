import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { dedication, formatDateSq } from '@/lib/dedication'
import { regulus } from '@/lib/astronomy'

const read = (p: string) => readFileSync(path.join(__dirname, '..', p), 'utf8')
const componentText = (readdirSync(path.join(__dirname, '..', 'src/components'), { recursive: true }) as string[])
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => read(path.join('src/components', f)))
  .join('\n')

describe('dedication content', () => {
  it('formats the birthday in Albanian', () => {
    expect(formatDateSq(dedication.birthday)).toBe('14 Mars 2006')
    expect(formatDateSq('2026-11-25')).toBe('25 Nëntor 2026')
  })

  it('never claims official naming', () => {
    expect(dedication.officialNaming).toBe(false)
    expect(componentText).toMatch(/nuk është emërtim zyrtar/)
    // the certificate says "dedikuar simbolikisht", never "emërtuar" / "emërtimi i yllit" / "regjistri i yjeve"
    const cert = read('src/components/Certificate.tsx')
    expect(cert).toMatch(/dedikuar simbolikisht/)
    expect(cert).toMatch(/IAU/)
    expect(cert.toLowerCase()).not.toMatch(/emërtimi i yllit|regjistri i yjeve|emërtuar zyrtarisht/)
  })

  it('records verified astronomy with sources (M4)', () => {
    expect(regulus.verified).toBe(true)
    expect(regulus.sources.some((s) => s.includes('simbad'))).toBe(true)
    expect(dedication.astronomyVerified).toBe(true)
  })

  it('uses correct Albanian diacritics in key UI strings', () => {
    for (const s of ['Fillo udhëtimin', 'Gëzuar ditëlindjen', 'Një yll për ty', 'Vizualizim artistik', 'vite-dritë', 'Yjësia e kujtimeve', 'Kujtimi i mëparshëm', 'Kujtimi i radhës']) {
      expect(componentText).toContain(s)
    }
    // common mistakes: missing ë
    for (const bad of ['Gezuar', 'ditelindjen', 'udhetimin', 'Nje yll']) {
      expect(componentText).not.toContain(bad)
    }
  })
})
