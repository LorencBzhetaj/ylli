import { describe, expect, it } from 'vitest'
import { capsuleView, DRAFT_LETTER } from '@/lib/privateContent'

const cfg = { unlockAt: '2027-03-14T00:00:00+01:00', title: 'Për të ardhmen', message: 'SEKRET', voice: 'x.mp3' }

describe('time capsule (server-enforced release)', () => {
  it('is "not configured" without a config', () => {
    expect(capsuleView(null)).toEqual({ configured: false })
  })

  it('never includes the message before the unlock instant', () => {
    const v = capsuleView(cfg, new Date('2027-03-13T22:59:59Z'))
    expect(v).toEqual({ configured: true, locked: true, unlockAt: '2027-03-13T23:00:00.000Z' })
    expect(JSON.stringify(v)).not.toContain('SEKRET')
  })

  it('opens exactly at the unlock instant (Tirana midnight = 23:00 UTC in winter)', () => {
    const v = capsuleView(cfg, new Date('2027-03-13T23:00:00Z'))
    expect(v).toMatchObject({ configured: true, locked: false, message: 'SEKRET', title: 'Për të ardhmen' })
  })
})

describe('draft letter', () => {
  it('is Albanian with correct diacritics and no official-naming claim', () => {
    expect(DRAFT_LETTER).toContain('E dashur Nadia')
    expect(DRAFT_LETTER).toContain('simbolikisht')
    expect(DRAFT_LETTER).toContain('Gëzuar ditëlindjen')
    expect(DRAFT_LETTER).not.toMatch(/Gezuar|ditelindjen|zyrtar/)
  })
})
