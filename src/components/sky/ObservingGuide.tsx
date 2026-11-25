'use client'

import { useEffect, useMemo, useState } from 'react'
import { REGULUS_SIMBAD, TIRANA } from '@/lib/astronomy'
import { altitudeSq, compassSq, j2000ToDate, julianDay, planNight, toHorizontal } from '@/lib/sky'

const STAR = { raDeg: REGULUS_SIMBAD.raDeg, decDeg: REGULUS_SIMBAD.decDeg }
const PM = { raMasYr: REGULUS_SIMBAD.pmRaMasYr, decMasYr: REGULUS_SIMBAD.pmDecMasYr }

const fmtTime = new Intl.DateTimeFormat('sq-AL', { timeZone: TIRANA.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const fmtYmd = new Intl.DateTimeFormat('en-CA', { timeZone: TIRANA.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
const MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor']
const t = (d: Date | null) => (d ? fmtTime.format(d) : '—')
const longDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** "Where do I look tonight from Tirana?" — computed live in the browser. */
export default function ObservingGuide() {
  const now = useNow(60_000)
  const [picked, setPicked] = useState<string | null>(null)
  const ymd = picked ?? (now ? fmtYmd.format(now) : null)
  const plan = useMemo(() => (ymd ? planNight(STAR, PM, TIRANA, ymd, 10) : null), [ymd])
  const current = useMemo(() => {
    if (!now) return null
    const jd = julianDay(now)
    return toHorizontal(j2000ToDate(STAR, jd, PM), jd, TIRANA.latDeg, TIRANA.lonDeg)
  }, [now])

  return (
    <section className="observe" aria-labelledby="observe-title">
      <h3 id="observe-title" className="observe__title">
        Si ta shohësh nga Tirana
      </h3>
      <label className="observe__date">
        <span>Nata e</span>
        <input type="date" value={ymd ?? ''} onChange={(e) => setPicked(e.target.value || null)} />
      </label>

      {plan ? (
        <div className="observe__body" aria-live="polite">
          {plan.bestStart && plan.bestEnd && plan.bestPosition ? (
            <p className="observe__best">
              Koha më e mirë: <strong>{t(plan.bestStart)}–{t(plan.bestEnd)}</strong>. Rreth orës{' '}
              {t(new Date((plan.bestStart.getTime() + plan.bestEnd.getTime()) / 2))} shiko drejt{' '}
              <strong>{compassSq(plan.bestPosition.azDeg)}</strong>, {altitudeSq(plan.bestPosition.altDeg)} (≈{' '}
              {Math.round(plan.bestPosition.altDeg)}°).
            </p>
          ) : (
            <p className="observe__best">
              Natën e {longDate(plan.date)} Regulus është afër Diellit dhe nuk duket në qiell të errët. Periudha më e mirë për ta parë
              mbrëmjeve është nga shkurti deri në maj.
            </p>
          )}
          <dl className="observe__facts">
            <div>
              <dt>Lind</dt>
              <dd>{t(plan.rise)}</dd>
            </div>
            <div>
              <dt>Më lart në qiell</dt>
              <dd>
                {plan.transit ? `${t(plan.transit.time)} · ${compassSq(plan.transit.azDeg)}, ≈ ${Math.round(plan.transit.altDeg)}°` : '—'}
              </dd>
            </div>
            <div>
              <dt>Perëndon</dt>
              <dd>{t(plan.set)}</dd>
            </div>
            {current && !picked ? (
              <div>
                <dt>Tani</dt>
                <dd>
                  {current.altDeg > 0
                    ? `${compassSq(current.azDeg)}, ≈ ${Math.round(current.altDeg)}° mbi horizont`
                    : 'nën horizont'}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="observe__note">
            Orët janë sipas kohës së Tiranës (Europe/Tirane). “Koha më e mirë” = Regulus mbi 10° dhe qielli i errët (Dielli nën −12°).
            Llogaritje e bërë në shfletues, me saktësi rreth një minutë; ndërtesat dhe malet mund ta fshehin horizontin.
          </p>
        </div>
      ) : (
        <p className="observe__body">Duke llogaritur…</p>
      )}
    </section>
  )
}
