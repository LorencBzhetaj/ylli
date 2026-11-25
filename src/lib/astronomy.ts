/**
 * Regulus (α Leonis) — CANDIDATE values from docs/SPEC.md.
 * NOT YET VERIFIED. Milestone M4 must check every value against SIMBAD
 * (https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Regulus) and a reliable ephemeris,
 * record source URLs + epoch here, then set config/dedication.json → astronomyVerified: true.
 */
export const regulus = {
  name: 'Regulus',
  designation: 'α Leonis',
  constellationSq: 'Luani',
  constellationGenitiveSq: 'Luanit',
  constellationLatin: 'Leo',
  epoch: 'J2000',
  ra: '10h 08m 22s',
  dec: '+11° 58′ 02″',
  distanceLy: 79,
  apparentMagnitude: 1.35,
  verified: false,
  sources: [] as string[],
} as const
