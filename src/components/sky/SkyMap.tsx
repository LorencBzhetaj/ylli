'use client'

/**
 * Interactive map of the real sky around Leo (SIMBAD positions, ICRS J2000).
 * Gold lines are the usual stick figure of Leo — no lion artwork.
 * Pan: drag / arrow keys · Zoom: wheel / pinch / + − buttons · "Regulus" recentres.
 */
import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import skyData from '@/data/sky-region.json'
import { stereographic } from '@/lib/sky'

type Star = [name: string, ra: number, dec: number, v: number]
const STARS = skyData.stars as Star[]

const CENTER = { ra: 160, dec: 14 }
const UNIT = 620 // px per stereographic unit (viewBox)
const W = 1000
const H = 760

const NAMES: Record<string, string> = {
  'alf Leo': 'Regulus',
  'bet Leo': 'Denebola',
  'gam01 Leo': 'Algieba',
  'del Leo': 'Zosma',
  'tet Leo': 'Chertan',
  'zet Leo': 'Adhafera',
  'mu. Leo': 'Rasalas',
  'eps Leo': 'ε Leo',
  'eta Leo': 'η Leo',
  'bet Gem': 'Pollux',
  'alf Hya': 'Alphard',
  'alf02 CVn': 'Cor Caroli',
  'eps Vir': 'Vindemiatrix',
  'gam Vir': 'Porrima',
}

const LEO_LINES: [string, string][] = [
  ['eps Leo', 'mu. Leo'],
  ['mu. Leo', 'zet Leo'],
  ['zet Leo', 'gam01 Leo'],
  ['gam01 Leo', 'eta Leo'],
  ['eta Leo', 'alf Leo'],
  ['alf Leo', 'tet Leo'],
  ['tet Leo', 'bet Leo'],
  ['bet Leo', 'del Leo'],
  ['del Leo', 'gam01 Leo'],
  ['del Leo', 'tet Leo'],
]

const CONSTELLATIONS: { label: string; ra: number; dec: number; main?: boolean }[] = [
  { label: 'LUANI', ra: 163, dec: 12.5, main: true },
  { label: 'Gaforrja', ra: 129, dec: 17 },
  { label: 'Virgjëresha', ra: 188, dec: 4 },
  { label: 'Hidra', ra: 142, dec: -4 },
  { label: 'Luani i Vogël', ra: 154, dec: 33 },
  { label: 'Binjakët', ra: 118, dec: 31 },
]

function project(ra: number, dec: number) {
  const p = stereographic(ra, dec, CENTER.ra, CENTER.dec)
  return { x: W / 2 + p.x * UNIT, y: H / 2 + p.y * UNIT }
}

const radius = (v: number) => 1.1 + Math.max(0, 5.3 - v) * 1.25

type View = { k: number; tx: number; ty: number }

export default function SkyMap() {
  const projected = useMemo(() => STARS.map(([name, ra, dec, v]) => ({ name, v, ...project(ra, dec) })), [])
  const byName = useMemo(() => new Map(projected.map((s) => [s.name, s])), [projected])
  const regulus = byName.get('alf Leo')!
  const home: View = useMemo(() => ({ k: 1, tx: 0, ty: 0 }), [])
  const [view, setView] = useState<View>(home)
  const svg = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const last = useRef<{ x: number; y: number; dist: number } | null>(null)

  const clampK = (k: number) => Math.min(6, Math.max(0.7, k))

  /** Convert a client point to viewBox coordinates. */
  const toBox = (cx: number, cy: number) => {
    const r = svg.current!.getBoundingClientRect()
    return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H }
  }

  const zoomAt = useCallback((factor: number, px = W / 2, py = H / 2) => {
    setView((v) => {
      const k = clampK(v.k * factor)
      const f = k / v.k
      return { k, tx: px - (px - v.tx) * f, ty: py - (py - v.ty) * f }
    })
  }, [])

  const centreOn = (x: number, y: number, k = 2.2) => setView({ k, tx: W / 2 - x * k, ty: H / 2 - y * k })

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    const p = toBox(e.clientX, e.clientY)
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y)
  }

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    svg.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, toBox(e.clientX, e.clientY))
    last.current = null
  }
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, toBox(e.clientX, e.clientY))
    const pts = [...pointers.current.values()]
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    if (last.current) {
      const dx = cx - last.current.x
      const dy = cy - last.current.y
      const factor = pts.length > 1 && last.current.dist > 0 ? dist / last.current.dist : 1
      setView((v) => {
        const k = clampK(v.k * factor)
        const f = k / v.k
        return { k, tx: cx - (cx - (v.tx + dx)) * f, ty: cy - (cy - (v.ty + dy)) * f }
      })
    }
    last.current = { x: cx, y: cy, dist }
  }
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    last.current = null
  }

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = 40
    const map: Record<string, () => void> = {
      ArrowLeft: () => setView((v) => ({ ...v, tx: v.tx + step })),
      ArrowRight: () => setView((v) => ({ ...v, tx: v.tx - step })),
      ArrowUp: () => setView((v) => ({ ...v, ty: v.ty + step })),
      ArrowDown: () => setView((v) => ({ ...v, ty: v.ty - step })),
      '+': () => zoomAt(1.25),
      '=': () => zoomAt(1.25),
      '-': () => zoomAt(1 / 1.25),
      '0': () => setView(home),
    }
    const fn = map[e.key]
    if (fn) {
      e.preventDefault()
      fn()
    }
  }

  // keep marks readable at any zoom
  const s = 1 / Math.sqrt(view.k)

  return (
    <figure className="skymap">
      <div className="skymap__frame">
        <svg
          ref={svg}
          className="skymap__svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Harta e qiellit rreth konstelacionit të Luanit, me yllin Regulus të theksuar"
          aria-describedby="skymap-desc"
          tabIndex={0}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKey}
        >
          <defs>
            <radialGradient id="sm-bg" cx="50%" cy="45%" r="75%">
              <stop offset="0" stopColor="#13244a" />
              <stop offset="1" stopColor="#030611" />
            </radialGradient>
            <radialGradient id="sm-glow">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="0.25" stopColor="#cfe0ff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#7aa2ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#sm-bg)" />
          <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
            <Graticule s={s} />
            {CONSTELLATIONS.map((c) => {
              const p = project(c.ra, c.dec)
              return (
                <text
                  key={c.label}
                  x={p.x}
                  y={p.y}
                  className={c.main ? 'skymap__const skymap__const--main' : 'skymap__const'}
                  fontSize={(c.main ? 22 : 15) * s}
                  textAnchor="middle"
                >
                  {c.label}
                </text>
              )
            })}
            {LEO_LINES.map(([a, b]) => {
              const p = byName.get(a)
              const q = byName.get(b)
              if (!p || !q) return null
              return <line key={a + b} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="skymap__line" strokeWidth={1.6 * s} />
            })}
            <circle cx={regulus.x} cy={regulus.y} r={46 * s} fill="url(#sm-glow)" />
            <circle cx={regulus.x} cy={regulus.y} r={18 * s} className="skymap__ring" strokeWidth={1.4 * s} />
            {projected.map((st) => (
              <circle key={st.name} cx={st.x} cy={st.y} r={radius(st.v) * s} className="skymap__star" />
            ))}
            {projected
              .filter((st) => NAMES[st.name])
              .map((st) => (
                <text
                  key={'l' + st.name}
                  x={st.x + (radius(st.v) + 6) * s}
                  y={st.y + 4 * s}
                  fontSize={(st.name === 'alf Leo' ? 19 : 13) * s}
                  className={st.name === 'alf Leo' ? 'skymap__label skymap__label--main' : 'skymap__label'}
                >
                  {NAMES[st.name]}
                </text>
              ))}
            <text x={regulus.x + 26 * s} y={regulus.y + 26 * s} fontSize={14 * s} className="skymap__dedication">
              ylli i dedikuar Nadias
            </text>
          </g>
          <CompassMarks />
        </svg>
        <div className="skymap__zoom" role="group" aria-label="Kontrollet e hartës">
          <button type="button" className="btn btn--ghost" onClick={() => zoomAt(1.3)} aria-label="Zmadho">
            +
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => zoomAt(1 / 1.3)} aria-label="Zvogëlo">
            −
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => centreOn(regulus.x, regulus.y)}>
            Regulus
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setView(home)}>
            Gjithë Luani
          </button>
        </div>
      </div>
      <figcaption className="skymap__legend">
        <p id="skymap-desc">
          Regulus është ylli më i ndritshëm i Luanit. Gjeje në fund të “drapërit”, një varg yjesh si një pikëpyetje e kthyer së prapthi
          (Regulus · η · Algieba · Adhafera · Rasalas · ε). Lëviz hartën duke e tërhequr; zmadho me rrotë, me dy gishta ose me + / −.
        </p>
        <ul className="skymap__keys">
          <li>
            <span className="skymap__dot skymap__dot--big" aria-hidden="true" /> yll i ndritshëm
          </li>
          <li>
            <span className="skymap__dot" aria-hidden="true" /> yll i zbehtë (deri në magnitudë 5.2)
          </li>
          <li>
            <span className="skymap__lineKey" aria-hidden="true" /> figura e Luanit
          </li>
        </ul>
        <p className="skymap__meta">
          Pozicione reale nga katalogu SIMBAD (CDS) · ICRS, epoka J2000 · 175 yje · lindja majtas, si kur sheh qiellin drejt jugut.
          Madhësitë dhe ngjyrat e pikave janë ilustruese.
        </p>
      </figcaption>
    </figure>
  )
}

function Graticule({ s }: { s: number }) {
  const lines: string[] = []
  for (let dec = -20; dec <= 45; dec += 10) {
    const pts: string[] = []
    for (let ra = 110; ra <= 210; ra += 2) {
      const p = project(ra, dec)
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    }
    lines.push(pts.join(' '))
  }
  for (let ra = 120; ra <= 200; ra += 15) {
    const pts: string[] = []
    for (let dec = -25; dec <= 50; dec += 2) {
      const p = project(ra, dec)
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    }
    lines.push(pts.join(' '))
  }
  return (
    <g className="skymap__grid" strokeWidth={0.8 * s}>
      {lines.map((pts, i) => (
        <polyline key={i} points={pts} fill="none" />
      ))}
    </g>
  )
}

function CompassMarks() {
  return (
    <g className="skymap__compass" fontSize="15">
      <text x={W / 2} y={26} textAnchor="middle">
        V ↑
      </text>
      <text x={22} y={H / 2} textAnchor="start">
        L
      </text>
      <text x={W - 22} y={H / 2} textAnchor="end">
        P
      </text>
    </g>
  )
}
