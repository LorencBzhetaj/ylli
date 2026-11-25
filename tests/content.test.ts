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
  })

  it('keeps astronomy flagged as unverified until M4', () => {
    expect(regulus.verified).toBe(false)
    expect(dedication.astronomyVerified).toBe(false)
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
