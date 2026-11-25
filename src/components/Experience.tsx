'use client'

import dynamic from 'next/dynamic'
import { Component, useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Envelope from './Envelope'
import StaticSky from './StaticSky'
import Gallery from './gallery/Gallery'
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
}

type Phase = 'envelope' | ScenePhase | 'gallery'

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

export default function Experience({ recipient, privateId, birthday, star, astronomyVerified }: Props) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const webgl = useWebGL()
  const [sceneFailed, setSceneFailed] = useState(false)
  const [phase, setPhase] = useState<Phase>('envelope')
  const [runId, setRunId] = useState(0)

  const use3D = webgl && !sceneFailed
  const onArrive = useCallback(() => setPhase((p) => (p === 'journey' ? 'reveal' : p)), [])
  const onSceneError = useCallback(() => setSceneFailed(true), [])

  const start = () => {
    setRunId((n) => n + 1)
    setPhase(use3D && !reducedMotion ? 'journey' : 'reveal')
  }
  const replay = () => {
    setRunId((n) => n + 1)
    setPhase(use3D && !reducedMotion ? 'journey' : 'reveal')
  }

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

  const topBar = (
    <div className="top-bar">
      <button className="btn btn--ghost" type="button" onClick={logout}>
        Dil
      </button>
    </div>
  )

  if (phase === 'gallery') {
    // The journey canvas is unmounted here (GPU resources released) — one WebGL context at a time.
    return (
      <>
        <Gallery can3D={use3D} reducedMotion={reducedMotion} onContinue={() => setPhase('finale')} />
        {topBar}
      </>
    )
  }

  if (phase === 'envelope') {
    return (
      <>
        <Envelope recipient={recipient} onStart={start} />
        <div className="top-bar">
          <button className="btn btn--ghost" type="button" onClick={logout}>
            Dil
          </button>
        </div>
      </>
    )
  }

  return (
    <>
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
          <button className="btn btn--ghost" type="button" onClick={() => setPhase('reveal')}>
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
                <dd>≈ {star.apparentMagnitude.toFixed(2)}</dd>
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
              Dedikim simbolik dhe privat — nuk është emërtim zyrtar astronomik.
              {use3D ? ' Pamja e udhëtimit është vizualizim artistik.' : ''}
            </p>
            <div className="actions">
              <button className="btn btn--gold" type="button" onClick={() => setPhase('gallery')}>
                Kujtimet
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => setPhase('finale')}>
                Te finalja
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
              <button className="btn btn--gold" type="button" onClick={replay}>
                Përsërit udhëtimin
              </button>
              <button className="btn" type="button" onClick={() => setPhase('gallery')}>
                Kujtimet
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => setPhase('reveal')}>
                Ylli
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => setPhase('envelope')}>
                Te zarfi
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="top-bar">
        <button className="btn btn--ghost" type="button" onClick={logout}>
          Dil
        </button>
      </div>
    </>
  )
}
