'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import type { PublicGalleryItem } from '@/lib/gallery'
import Gallery2D from './Gallery2D'
import Lightbox from './Lightbox'

const MemoryConstellation = dynamic(() => import('./MemoryConstellation'), { ssr: false })

type Props = {
  /** WebGL available and not failed. */
  can3D: boolean
  reducedMotion: boolean
  onContinue: () => void
}

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; items: PublicGalleryItem[]; needsPrepare?: boolean }

export default function Gallery({ can3D, reducedMotion, onContinue }: Props) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [mode, setMode] = useState<'3d' | '2d'>(can3D && !reducedMotion ? '3d' : '2d')
  const [failed3D, setFailed3D] = useState(false)
  const [focus, setFocus] = useState(0)
  const [goTo, setGoTo] = useState({ i: 0, n: 0 })
  const [open, setOpen] = useState<number | null>(null)

  // Gallery content is fetched only now, after authentication (the API re-checks the session).
  useEffect(() => {
    let alive = true
    fetch('/api/private/gallery', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { items: PublicGalleryItem[]; needsPrepare?: boolean }) => alive && setLoad({ state: 'ready', items: d.items, needsPrepare: d.needsPrepare }))
      .catch(() => alive && setLoad({ state: 'error' }))
    return () => {
      alive = false
    }
  }, [])

  const items = load.state === 'ready' ? load.items : []
  const count = items.length
  const show3D = mode === '3d' && can3D && !failed3D && count > 0

  const go = useCallback(
    (i: number) => {
      const c = Math.max(0, Math.min(count - 1, i))
      setFocus(c)
      setGoTo((g) => ({ i: c, n: g.n + 1 }))
    },
    [count],
  )

  // Arrow keys / Enter navigate the 3D constellation when no dialog is open.
  useEffect(() => {
    if (!show3D || open !== null) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        go(focus + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        go(focus - 1)
      } else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(count - 1)
      else if (e.key === 'Enter' && t === document.body) setOpen(focus)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show3D, open, focus, count, go])

  const current = items[focus]

  return (
    <section className={`gallery${show3D ? ' gallery--3d' : ''}`} aria-labelledby="gallery-title">
      {show3D ? (
        <div className="stage">
          <MemoryConstellation items={items} focus={focus} goTo={goTo} onFocusChange={setFocus} onOpen={setOpen} onError={() => setFailed3D(true)} />
        </div>
      ) : null}

      <header className="gallery__head">
        <p className="eyebrow">Kujtimet</p>
        <h2 id="gallery-title" className="gallery__title">
          Yjësia e kujtimeve
        </h2>
        {show3D ? <p className="gallery__hint">Rrotullo, rrëshqit ose përdor shigjetat · prek një foto për ta hapur</p> : null}
      </header>

      {load.state === 'loading' ? <p className="gallery__status">Duke ngarkuar kujtimet…</p> : null}
      {load.state === 'error' ? <p className="gallery__status">Kujtimet nuk u ngarkuan. Provo të rifreskosh faqen.</p> : null}
      {load.state === 'ready' && count === 0 ? (
        <p className="gallery__status">
          Ende nuk ka kujtime. {load.needsPrepare ? 'Përgatiti me: npm run gallery:prepare' : ''}
        </p>
      ) : null}

      {!show3D && count > 0 ? <Gallery2D items={items} onOpen={setOpen} /> : null}

      <div className={show3D ? 'gallery__bar gallery__bar--fixed' : 'gallery__bar'}>
        {show3D && current ? (
          <>
            <p className="gallery__caption" aria-live="polite">
              <span className="gallery__count">
                {focus + 1} / {count}
              </span>{' '}
              {current.placeholder ? <span className="tag">Placeholder</span> : null} {current.caption}
            </p>
            <div className="gallery__controls">
              <button className="btn btn--ghost" type="button" onClick={() => go(focus - 1)} disabled={focus === 0} aria-label="Kujtimi i mëparshëm">
                ‹
              </button>
              <button className="btn" type="button" onClick={() => setOpen(focus)}>
                {current.type === 'video' ? 'Shiko videon' : 'Hap foton'}
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => go(focus + 1)} disabled={focus === count - 1} aria-label="Kujtimi i radhës">
                ›
              </button>
            </div>
          </>
        ) : null}
        <div className="gallery__controls">
          {can3D && !failed3D && count > 0 ? (
            <button className="btn btn--ghost" type="button" onClick={() => {
                if (mode === '2d') go(focus) // re-enter 3D at the memory last viewed
                setMode(mode === '3d' ? '2d' : '3d')
              }} aria-pressed={mode === '2d'}>
              {mode === '3d' ? 'Pamje 2D' : 'Pamje 3D'}
            </button>
          ) : null}
          <button className="btn btn--gold" type="button" onClick={onContinue}>
            Vazhdo
          </button>
        </div>
      </div>

      {open !== null && items[open] ? (
        <Lightbox
          items={items}
          index={open}
          onIndex={(i) => {
            setOpen(i)
            if (show3D) go(i)
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  )
}
