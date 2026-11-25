/**
 * Regulus (α Leonis) — values VERIFIED against SIMBAD on 2026-11-25.
 * Source page: https://simbad.harvard.edu/simbad/sim-id?Ident=alf+Leo (official SIMBAD mirror of CDS)
 * Details and assumptions: docs/ASTRONOMY.md
 */

/** Raw SIMBAD values (ICRS, epoch J2000). */
export const REGULUS_SIMBAD = {
  raDeg: 152.09296243828146, // 10 08 22.31099
  decDeg: 11.967208776100023, // +11 58 01.9516
  coordRef: '2007A&A...474..653V', // van Leeuwen 2007, Hipparcos new reduction
  pmRaMasYr: -248.73, // μα·cos δ
  pmDecMasYr: 5.59,
  parallaxMas: 41.13,
  parallaxErrMas: 0.35,
  parallaxRef: '2007A&A...474..653V',
  vMag: 1.4,
  vMagErr: 0.05,
  vMagRef: '2009ApJ...694.1085V',
  spectralType: 'B8IVn',
  spectralTypeRef: '2024A&A...690A.176N',
} as const

const LY_PER_PC = 3.261563777
/** 1000 / 41.13 mas = 24.31 pc = 79.3 ly (± 0.7 ly from the parallax error). */
export const regulusDistanceLy = (1000 / REGULUS_SIMBAD.parallaxMas) * LY_PER_PC

export const regulus = {
  name: 'Regulus',
  designation: 'α Leonis',
  constellationSq: 'Luani',
  constellationGenitiveSq: 'Luanit',
  constellationLatin: 'Leo',
  epoch: 'J2000',
  ra: '10h 08m 22.3s',
  dec: '+11° 58′ 02″',
  distanceLy: Math.round(regulusDistanceLy),
  apparentMagnitude: REGULUS_SIMBAD.vMag,
  spectralType: REGULUS_SIMBAD.spectralType,
  verified: true,
  verifiedOn: '2026-11-25',
  sources: [
    'https://simbad.harvard.edu/simbad/sim-id?Ident=alf+Leo',
    'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=alf+Leo',
  ],
} as const

/** Tirana, Albania — used for observing guidance (not a birth-sky claim). */
export const TIRANA = { name: 'Tiranë', latDeg: 41.3275, lonDeg: 19.8187, timeZone: 'Europe/Tirane' } as const
