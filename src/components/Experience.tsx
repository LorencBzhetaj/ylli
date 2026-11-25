'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Envelope from './Envelope'
import StaticSky from './StaticSky'
import Gallery from './gallery/Gallery'
import MusicToggle from './MusicToggle'
import Certificate, { type CertificateProps } from './Certificate'
import Letter from './chapters/Letter'
import Capsule from './chapters/Capsule'
import SkyMap from './sky/SkyMap'
import ObservingGuide from './sky/ObservingGuide'
import type { ScenePhase } from './JourneyScene'

// Client-only, lazy-loaded 3D scene (Three.js never ships in the entry bundle).
const JourneyScene = dynamic(() => import('./JourneyScene'), { ssr: false, loading: () => <StaticSky showStar={false} /> })

type Star = {
  name: string
  designation: string
  constellationSq: string
  constellationGenitiveSq: string
  epoch: string
  ra: string
  dec: string
  distanceLy: number
  apparentMagnitude: number
}

type Props = {
  recipient: string
  privateId: string
  birthday: string
  star: Star
  astronomyVerified: boolean
  certificate: CertificateProps
}

type Chapter = 'gallery' | 'sky' | 'letter' | 'capsule' | 'certificate'
type Phase = 'envelope' | ScenePhase | Chapter

/** Story order from docs/SPEC.md §Experience (1 entry … 9 finale). */
const ORDER: Phase[] = ['envelope', 'journey', 'reveal', 'gallery', 'sky', 'letter', 'capsule', 'certificate', 'finale']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']
const LABEL: Record<Chapter | 'reveal', string> = {
  reveal: 'Ylli',
  gallery: 'Kujtimet',
  sky: 'Harta e qiellit',
  letter: 'Letra',
  capsule: 'Kapsula e kohës',
  certificate: 'Certifikata',
}

// ——— environment hooks ———
function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const getMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, getMotion, () => false)
}

let webglCache: boolean | null = null
function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache
  try {
    const c = document.createElement('canvas')
    webglCache = Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webglCache = false
  }
  return webglCache
}
const noop = () => () => {}
function useWebGL() {
  return useSyncExternalStore(noop, hasWebGL, () => true)
}

class SceneBoundary extends Component<{ fallback: ReactNode; onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function ChapterShell({
  phase,
  title,
  lead,
  onPrev,
  onNext,
  nextLabel = 'Vazhdo',
  children,
}: {
  phase: Phase
  title: string
  lead?: ReactNode
  onPrev: () => void
  onNext: () => void
  nextLabel?: string
  children: ReactNode
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  // Move focus to the new chapter heading so keyboard & screen-reader users land at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
    heading.current?.focus()
  }, [phase])
  const i = ORDER.indexOf(phase)
  return (
    <main className="chapter">
      <div className="chapter__inner fade-in">
        <header className="chapter__head">
          <span className="chapter__count">
            {ROMAN[i]} / {ROMAN[ROMAN.length - 1]}
          </span>
          <h2 className="chapter__title" ref={heading} tabIndex={-1}>
            {title}
          </h2>
          {lead ? <p className="chapter__lead">{lead}</p> : null}
        </header>
        {children}
        <nav className="chapter__nav" aria-label="Kapitujt">
          <button className="btn btn--ghost" type="button" onClick={onPrev}>
            ‹ Mbrapa
          </button>
          <button className="btn btn--gold" type="button" onClick={onNext}>
            {nextLabel} ›
          </button>
        </nav>
      </div>
    </main>
  )
}

export default function Experience({ recipient, privateId, birthday, star, astronomyVerified, certificate }: Props) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const webgl = useWebGL()
  const [sceneFailed, setSceneFailed] = useState(false)
  const [phase, setPhase] = useState<Phase>('envelope')
  const [runId, setRunId] = useState(0)

  const use3D = webgl && !sceneFailed
  const onArrive = useCallback(() => setPhase((p) => (p === 'journey' ? 'reveal' : p)), [])
  const onSceneError = useCallback(() => setSceneFailed(true), [])

  const startJourney = () => {
    setRunId((n) => n + 1)
    setPhase(use3D && !reducedMotion ? 'journey' : 'reveal')
  }
  const go = (p: Phase) => setPhase(p)

  // Esc skips the journey.
  useEffect(() => {
    if (phase !== 'journey') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPhase('reveal')
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
    router.replace('/')
  }

  let content: ReactNode
  if (phase === 'envelope') {
    content = <Envelope key="envelope" recipient={recipient} onStart={startJourney} />
  } else if (phase === 'gallery') {
    // The journey canvas is unmounted here (GPU resources released) — one WebGL context at a time.
    content = <Gallery key="gallery" can3D={use3D} reducedMotion={reducedMotion} onContinue={() => go('sky')} />
  } else if (phase === 'sky') {
    content = (
      <ChapterShell
        key="sky"
        phase={phase}
        title="Harta e qiellit"
        lead="Qielli i vërtetë rreth Luanit. Regulus, ylli i dedikuar Nadias, është pika e artë në fund të “drapërit”."
        onPrev={() => go('gallery')}
        onNext={() => go('letter')}
      >
        <div className="sky-layout">
          <SkyMap />
          <ObservingGuide />
        </div>
      </ChapterShell>
    )
  } else if (phase === 'letter') {
    content = (
      <ChapterShell key="letter" phase={phase} title="Letra" onPrev={() => go('sky')} onNext={() => go('capsule')}>
        <Letter />
      </ChapterShell>
    )
  } else if (phase === 'capsule') {
    content = (
      <ChapterShell
        key="capsule"
        phase={phase}
        title="Kapsula e kohës"
        lead="Një mesazh që pret ditën e vet."
        onPrev={() => go('letter')}
        onNext={() => go('certificate')}
      >
        <Capsule />
      </ChapterShell>
    )
  } else if (phase === 'certificate') {
    content = (
      <ChapterShell
        key="certificate"
        phase={phase}
        title="Certifikata"
        lead="E njëjta certifikatë që do të printohet për paketën. Mund ta hapësh në madhësi A4 dhe ta ruash si PDF."
        onPrev={() => go('capsule')}
        onNext={() => go('finale')}
        nextLabel="Finalja"
      >
        <div className="cert-chapter">
          <Certificate {...certificate} />
          <Link className="btn" href="/experience/certifikata">
            Hap për printim / PDF
          </Link>
        </div>
      </ChapterShell>
    )
  } else {
    content = (
      <div key="scene">
        <div className="stage">
          {use3D ? (
            <SceneBoundary fallback={<StaticSky />} onError={onSceneError}>
              <JourneyScene phase={phase} reducedMotion={reducedMotion} runId={runId} onArrive={onArrive} onError={onSceneError} />
            </SceneBoundary>
          ) : (
            <StaticSky />
          )}
        </div>

        {phase === 'journey' ? (
          <div className="hud" role="region" aria-label="Udhëtimi">
            <p className="hud__label">Vizualizim artistik — jo udhëtim në shkallë reale.</p>
            <button className="btn btn--ghost" type="button" onClick={() => go('reveal')}>
              Kalo
            </button>
            <p className="sr-only" aria-live="polite">
              Udhëtim nga Toka drejt yllit Regulus. Shtyp Escape ose butonin Kalo për ta kaluar.
            </p>
          </div>
        ) : null}

        {phase === 'reveal' ? (
          <div className="overlay overlay--low">
            <section className="reveal fade-in" aria-labelledby="reveal-title">
              <p className="eyebrow">Një yll për ty</p>
              <h1 id="reveal-title" className="display reveal__name">
                {recipient}
              </h1>
              <p className="reveal__tagline">
                {star.name} ({star.designation}) · Konstelacioni i {star.constellationGenitiveSq}
              </p>
              <span className="divider" aria-hidden="true">✦</span>
              <dl className="facts">
                <div>
                  <dt>Distanca</dt>
                  <dd>≈ {star.distanceLy} vite-dritë</dd>
                </div>
                <div>
                  <dt>Magnituda</dt>
                  <dd>{star.apparentMagnitude.toFixed(2)}</dd>
                </div>
                <div className="wide">
                  <dt>Koordinatat ({star.epoch})</dt>
                  <dd>
                    RA {star.ra} · Dec {star.dec}
                  </dd>
                </div>
                <div className="wide">
                  <dt>Ditëlindja</dt>
                  <dd>{birthday}</dd>
                </div>
                <div className="wide">
                  <dt>ID private</dt>
                  <dd>{privateId}</dd>
                </div>
              </dl>
              {!astronomyVerified ? <span className="tag">Vlera paraprake · në verifikim</span> : null}
              <p className="notice">
                Dedikim simbolik dhe privat — nuk është emërtim zyrtar astronomik. Të dhënat e yllit: SIMBAD.
                {use3D ? ' Pamja e udhëtimit është vizualizim artistik.' : ''}
              </p>
              <div className="actions">
                <button className="btn btn--gold" type="button" onClick={() => go('gallery')}>
                  Vazhdo
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {phase === 'finale' ? (
          <div className="overlay overlay--low">
            <section className="finale fade-in fade-in--late" aria-labelledby="finale-title">
              <h2 id="finale-title" className="finale__quote">
                Në univers ka miliarda yje, por ky është i yti.
              </h2>
              <span className="divider" aria-hidden="true">✦</span>
              <p className="finale__wish">Gëzuar ditëlindjen, {recipient}!</p>
              <div className="actions">
                <button className="btn btn--gold" type="button" onClick={startJourney}>
                  Përsërit udhëtimin
                </button>
              </div>
              <nav className="actions finale__menu" aria-label="Kapitujt">
                {(['reveal', 'gallery', 'sky', 'letter', 'capsule', 'certificate'] as const).map((p) => (
                  <button key={p} className="btn btn--ghost" type="button" onClick={() => go(p)}>
                    {LABEL[p]}
                  </button>
                ))}
                <button className="btn btn--ghost" type="button" onClick={() => go('envelope')}>
                  Te zarfi
                </button>
              </nav>
            </section>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <>
      {content}
      <div className="top-bar">
        <MusicToggle />
        <button className="btn btn--ghost" type="button" onClick={logout}>
          Dil
        </button>
      </div>
    </>
  )
}
