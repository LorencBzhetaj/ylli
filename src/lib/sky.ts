/**
 * Small, dependency-free positional astronomy for observing guidance.
 * Algorithms: J. Meeus, "Astronomical Algorithms", 2nd ed. (1998):
 *   ch.7 Julian Day · ch.12 sidereal time · ch.13 horizontal coords · ch.21 precession (rigorous)
 *   ch.25 low-precision Sun.
 * Accuracy target: ~0.01° for stars, ~1 min for rise/transit/set — ample for "where to look".
 * Not modelled: nutation & aberration (< 0.01°), refraction except the standard −0.5667° horizon.
 * Verified against Meeus' worked examples in tests/sky.test.ts.
 */

const D2R = Math.PI / 180
const R2D = 180 / Math.PI
const norm360 = (x: number) => ((x % 360) + 360) % 360

export function julianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5
}

/** Greenwich mean sidereal time in degrees (Meeus 12.4). */
export function gmstDeg(jd: number): number {
  const T = (jd - 2_451_545.0) / 36_525
  return norm360(280.46061837 + 360.98564736629 * (jd - 2_451_545.0) + 0.000387933 * T * T - (T * T * T) / 38_710_000)
}

export type Equatorial = { raDeg: number; decDeg: number }
export type Horizontal = { altDeg: number; azDeg: number } // azimuth from North, through East

/**
 * Proper motion (μα·cosδ, μδ in mas/yr) + rigorous precession from J2000.0 to the given JD (Meeus 21.2–21.4).
 */
export function j2000ToDate(pos: Equatorial, jd: number, pm?: { raMasYr: number; decMasYr: number }): Equatorial {
  const years = (jd - 2_451_545.0) / 365.25
  let ra = pos.raDeg
  let dec = pos.decDeg
  if (pm) {
    ra += (pm.raMasYr * years) / 3_600_000 / Math.cos(dec * D2R)
    dec += (pm.decMasYr * years) / 3_600_000
  }
  const t = (jd - 2_451_545.0) / 36_525
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t ** 3) / 3600
  const z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t ** 3) / 3600
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t ** 3) / 3600
  const a0 = ra * D2R
  const d0 = dec * D2R
  const A = Math.cos(d0) * Math.sin(a0 + zeta * D2R)
  const B = Math.cos(theta * D2R) * Math.cos(d0) * Math.cos(a0 + zeta * D2R) - Math.sin(theta * D2R) * Math.sin(d0)
  const C = Math.sin(theta * D2R) * Math.cos(d0) * Math.cos(a0 + zeta * D2R) + Math.cos(theta * D2R) * Math.sin(d0)
  return { raDeg: norm360(Math.atan2(A, B) * R2D + z), decDeg: Math.asin(C) * R2D }
}

/** Equatorial (of date) → horizontal for an observer (lon east-positive). */
export function toHorizontal(eq: Equatorial, jd: number, latDeg: number, lonDeg: number): Horizontal {
  const H = (gmstDeg(jd) + lonDeg - eq.raDeg) * D2R
  const phi = latDeg * D2R
  const d = eq.decDeg * D2R
  const alt = Math.asin(Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H))
  // Meeus gives azimuth from South; +180° converts to the usual North-based azimuth.
  const azSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(d) * Math.cos(phi))
  return { altDeg: alt * R2D, azDeg: norm360(azSouth * R2D + 180) }
}

/** Low-precision apparent Sun position (Meeus ch.25), ~0.01°. */
export function sunPosition(jd: number): Equatorial {
  const T = (jd - 2_451_545.0) / 36_525
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T)
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M)
  const omega = (125.04 - 1934.136 * T) * D2R
  const lambda = (L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) * D2R
  const eps0 = 23 + 26 / 60 + 21.448 / 3600 - (46.815 * T + 0.00059 * T * T - 0.001813 * T ** 3) / 3600
  const eps = (eps0 + 0.00256 * Math.cos(omega)) * D2R
  return {
    raDeg: norm360(Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) * R2D),
    decDeg: Math.asin(Math.sin(eps) * Math.sin(lambda)) * R2D,
  }
}

/** Offset of a time zone from UTC (minutes) at a given instant, via Intl. */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000)
}

/** Local wall-clock time in a zone → UTC Date (handles DST). */
export function zonedTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm))
  const off1 = tzOffsetMinutes(guess, timeZone)
  const first = new Date(guess.getTime() - off1 * 60_000)
  const off2 = tzOffsetMinutes(first, timeZone)
  return off2 === off1 ? first : new Date(guess.getTime() - off2 * 60_000)
}

export type NightPlan = {
  /** Local date the night starts on (YYYY-MM-DD). */
  date: string
  rise: Date | null
  transit: { time: Date; altDeg: number; azDeg: number } | null
  set: Date | null
  /** Interval where the star is ≥ minAlt and the Sun is ≤ −12° (nautical darkness). */
  bestStart: Date | null
  bestEnd: Date | null
  /** Position at the middle of the best window. */
  bestPosition: Horizontal | null
  circumpolar: boolean
  neverRises: boolean
}

/**
 * Observing plan for the night beginning on local date `ymd` (noon → next noon) at the given site.
 * Brute-force sampled every 2 min, then refined by bisection — robust and simple.
 */
export function planNight(
  star: Equatorial,
  pm: { raMasYr: number; decMasYr: number } | undefined,
  site: { latDeg: number; lonDeg: number; timeZone: string },
  ymd: string,
  minAlt = 10,
): NightPlan {
  const [y, m, d] = ymd.split('-').map(Number)
  const start = zonedTimeToUtc(y, m, d, 12, 0, site.timeZone).getTime()
  const end = start + 86_400_000
  const posAt = (ms: number) => {
    const jd = julianDay(new Date(ms))
    return toHorizontal(j2000ToDate(star, jd, pm), jd, site.latDeg, site.lonDeg)
  }
  const sunAlt = (ms: number) => {
    const jd = julianDay(new Date(ms))
    return toHorizontal(sunPosition(jd), jd, site.latDeg, site.lonDeg).altDeg
  }
  const HORIZON = -0.5667
  const refine = (a: number, b: number, f: (ms: number) => number) => {
    let lo = a
    let hi = b
    const sLo = Math.sign(f(lo))
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      if (Math.sign(f(mid)) === sLo) lo = mid
      else hi = mid
    }
    return new Date(Math.round((lo + hi) / 2))
  }

  const STEP = 2 * 60_000
  let rise: Date | null = null
  let set: Date | null = null
  let best: { t: number; alt: number } | null = null
  let bestStart: Date | null = null
  let bestEnd: Date | null = null
  let minA = 90
  let maxA = -90
  let prev = posAt(start).altDeg
  let prevGood = prev >= minAlt && sunAlt(start) <= -12
  if (prevGood) bestStart = new Date(start)
  for (let t = start + STEP; t <= end; t += STEP) {
    const alt = posAt(t).altDeg
    minA = Math.min(minA, alt)
    maxA = Math.max(maxA, alt)
    if (!rise && prev < HORIZON && alt >= HORIZON) rise = refine(t - STEP, t, (ms) => posAt(ms).altDeg - HORIZON)
    if (!set && prev >= HORIZON && alt < HORIZON) set = refine(t - STEP, t, (ms) => posAt(ms).altDeg - HORIZON)
    if (!best || alt > best.alt) best = { t, alt }
    const good = alt >= minAlt && sunAlt(t) <= -12
    if (good && !prevGood && !bestStart) bestStart = new Date(t)
    if (!good && prevGood && bestStart && !bestEnd) bestEnd = new Date(t - STEP)
    prev = alt
    prevGood = good
  }
  if (bestStart && !bestEnd && prevGood) bestEnd = new Date(end)

  let transit: NightPlan['transit'] = null
  if (best) {
    // refine the maximum with a golden-section-ish ternary search around the sampled peak
    let lo = best.t - STEP
    let hi = best.t + STEP
    for (let i = 0; i < 30; i++) {
      const a = lo + (hi - lo) / 3
      const b = hi - (hi - lo) / 3
      if (posAt(a).altDeg < posAt(b).altDeg) lo = a
      else hi = b
    }
    const tt = Math.round((lo + hi) / 2)
    const p = posAt(tt)
    transit = { time: new Date(tt), altDeg: p.altDeg, azDeg: p.azDeg }
  }
  const bestPosition = bestStart && bestEnd ? posAt((bestStart.getTime() + bestEnd.getTime()) / 2) : null
  return {
    date: ymd,
    rise,
    transit,
    set,
    bestStart,
    bestEnd,
    bestPosition,
    circumpolar: minA > HORIZON,
    neverRises: maxA < HORIZON,
  }
}

const DIRS_SQ = ['veri', 'verilindje', 'lindje', 'juglindje', 'jug', 'jugperëndim', 'perëndim', 'veriperëndim']
/** Compass direction in Albanian for a North-based azimuth. */
export function compassSq(azDeg: number): string {
  return DIRS_SQ[Math.round(norm360(azDeg) / 45) % 8]
}

/** Human description of altitude in Albanian. */
export function altitudeSq(altDeg: number): string {
  if (altDeg < 0) return 'nën horizont'
  if (altDeg < 15) return 'shumë ulët mbi horizont'
  if (altDeg < 35) return 'ulët mbi horizont'
  if (altDeg < 60) return 'në mes të qiellit'
  return 'lart në qiell'
}

/** Stereographic projection centred on (ra0, dec0); east to the LEFT as seen looking up. Returns unit-sphere coords. */
export function stereographic(raDeg: number, decDeg: number, ra0Deg: number, dec0Deg: number): { x: number; y: number } {
  const a = raDeg * D2R
  const d = decDeg * D2R
  const a0 = ra0Deg * D2R
  const d0 = dec0Deg * D2R
  const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0)
  const k = 2 / (1 + cosc)
  const x = k * Math.cos(d) * Math.sin(a - a0)
  const y = k * (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0))
  return { x: -x, y: -y } // screen: x right, y down; RA increases to the left
}
