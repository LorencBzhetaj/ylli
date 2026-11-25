import { describe, expect, it } from 'vitest'
import { compassSq, gmstDeg, j2000ToDate, julianDay, planNight, sunPosition, toHorizontal, zonedTimeToUtc } from '@/lib/sky'
import { REGULUS_SIMBAD, regulus, regulusDistanceLy, TIRANA } from '@/lib/astronomy'

const hms = (h: number, m: number, s: number) => (h + m / 60 + s / 3600) * 15
const dms = (sign: 1 | -1, d: number, m: number, s: number) => sign * (d + m / 60 + s / 3600)

// Reference values: J. Meeus, Astronomical Algorithms, 2nd ed., worked examples.
describe('sidereal time (Meeus ex. 12.a, 12.b)', () => {
  it('1987-04-10 0h UT → 13h10m46.3668s', () => {
    expect(julianDay(new Date(Date.UTC(1987, 3, 10)))).toBeCloseTo(2446895.5, 6)
    expect(gmstDeg(2446895.5)).toBeCloseTo(hms(13, 10, 46.3668), 4)
  })
  it('1987-04-10 19:21 UT → 8h34m57.0896s', () => {
    expect(gmstDeg(julianDay(new Date(Date.UTC(1987, 3, 10, 19, 21))))).toBeCloseTo(hms(8, 34, 57.0896), 4)
  })
})

describe('horizontal coordinates (Meeus ex. 13.b, Venus from Washington)', () => {
  it('matches azimuth 68.0337° (from S) and altitude 15.1249°', () => {
    const jd = julianDay(new Date(Date.UTC(1987, 3, 10, 19, 21)))
    const h = toHorizontal({ raDeg: hms(23, 9, 16.641), decDeg: dms(-1, 6, 43, 11.61) }, jd, dms(1, 38, 55, 17), -dms(1, 77, 3, 56))
    expect(h.altDeg).toBeCloseTo(15.1249, 2)
    expect(h.azDeg).toBeCloseTo(68.0337 + 180, 2)
  })
})

describe('precession + proper motion (Meeus ex. 21.b, θ Persei → 2028 Nov 13.19)', () => {
  it('matches α = 2h46m11.331s, δ = +49°20′54.54″ within 1″', () => {
    const dec0 = dms(1, 49, 13, 42.48)
    const pmRa = 0.03425 * 15 * 1000 * Math.cos((dec0 * Math.PI) / 180) // s/yr → mas/yr (μα·cosδ)
    const p = j2000ToDate({ raDeg: hms(2, 44, 11.986), decDeg: dec0 }, 2462088.69, { raMasYr: pmRa, decMasYr: -89.5 })
    expect(Math.abs(p.raDeg - hms(2, 46, 11.331)) * 3600).toBeLessThan(1)
    expect(Math.abs(p.decDeg - dms(1, 49, 20, 54.54)) * 3600).toBeLessThan(1)
  })
})

describe('Sun (Meeus ex. 25.a, 1992 Oct 13.0)', () => {
  it('matches α = 13h13m31.4s, δ = −7°47′06″ within 0.01°', () => {
    const s = sunPosition(2448908.5)
    expect(Math.abs(s.raDeg - hms(13, 13, 31.4))).toBeLessThan(0.01)
    expect(Math.abs(s.decDeg - dms(-1, 7, 47, 6))).toBeLessThan(0.01)
  })
})

describe('time zones (Europe/Tirane)', () => {
  it('handles CET and CEST', () => {
    expect(zonedTimeToUtc(2026, 3, 14, 20, 0, 'Europe/Tirane').toISOString()).toBe('2026-03-14T19:00:00.000Z')
    expect(zonedTimeToUtc(2026, 7, 1, 20, 0, 'Europe/Tirane').toISOString()).toBe('2026-07-01T18:00:00.000Z')
  })
})

describe('Regulus (SIMBAD) and Tirana observing plan', () => {
  it('derives ~79 ly from the SIMBAD parallax', () => {
    expect(regulusDistanceLy).toBeGreaterThan(79)
    expect(regulusDistanceLy).toBeLessThan(80)
    expect(regulus.distanceLy).toBe(79)
    expect(regulus.verified).toBe(true)
    expect(regulus.sources.length).toBeGreaterThan(0)
  })

  it('transits due south at ~60.6° around 22:15 local on 14 March 2026', () => {
    const plan = planNight(
      { raDeg: REGULUS_SIMBAD.raDeg, decDeg: REGULUS_SIMBAD.decDeg },
      { raMasYr: REGULUS_SIMBAD.pmRaMasYr, decMasYr: REGULUS_SIMBAD.pmDecMasYr },
      TIRANA,
      '2026-03-14',
    )
    // geometry: max altitude = 90 − φ + δ(of date)
    expect(plan.transit!.altDeg).toBeGreaterThan(60.3)
    expect(plan.transit!.altDeg).toBeLessThan(60.9)
    expect(Math.abs(plan.transit!.azDeg - 180)).toBeLessThan(0.5)
    expect(compassSq(plan.transit!.azDeg)).toBe('jug')
    const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Tirane', hour: '2-digit', minute: '2-digit' }).format(plan.transit!.time)
    expect(local >= '22:05' && local <= '22:30').toBe(true)
    expect(plan.rise && plan.set).toBeTruthy()
    expect(plan.bestStart && plan.bestEnd).toBeTruthy()
    expect(plan.circumpolar).toBe(false)
  })

  it('reports no dark-sky window when Regulus is up only in daylight (late August)', () => {
    const plan = planNight({ raDeg: REGULUS_SIMBAD.raDeg, decDeg: REGULUS_SIMBAD.decDeg }, undefined, TIRANA, '2026-08-24')
    expect(plan.bestStart).toBeNull()
  })
})

