'use client'

import { useEffect, useRef, useState } from 'react'
import type { PublicGalleryItem } from '@/lib/gallery'

type Props = {
  items: PublicGalleryItem[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}

/** Accessible full-size viewer: focus trap, Esc, ←/→, swipe, restores focus on close. */
export default function Lightbox({ items, index, onIndex, onClose }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const item = items[index]
  const count = items.length
  const prev = () => onIndex((index - 1 + count) % count)
  const next = () => onIndex((index + 1) % count)
  const loaded = item.type === 'video' || loadedSrc === item.full

  // Focus management: remember opener, focus close button, restore on unmount.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeBtn.current?.focus()
    return () => opener?.focus?.()
  }, [])

  // Keyboard: Esc, arrows, Tab trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Let a focused video keep its own arrow-key seeking.
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target instanceof HTMLVideoElement) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onIndex((index - 1 + count) % count)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onIndex((index + 1) % count)
      } else if (e.key === 'Tab' && dialog.current) {
        const f = dialog.current.querySelectorAll<HTMLElement>('button, video[controls], [href], [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, count, onIndex, onClose])

  // Preload neighbours so prev/next feels instant.
  useEffect(() => {
    for (const j of [index - 1, index + 1]) {
      const it = items[(j + count) % count]
      if (it?.type === 'image' && it.full) new Image().src = it.full
    }
  }, [index, items, count])

  // Swipe (touch) — horizontal only.
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') touch.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const t = touch.current
    touch.current = null
    if (!t) return
    const dx = e.clientX - t.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - t.y) * 1.5) {
      if (dx < 0) next()
      else prev()
    }
  }

  const captionId = `lb-caption-${item.id}`
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-labelledby={captionId} ref={dialog}>
      <div className="lightbox__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="lightbox__top">
        <span className="lightbox__count" aria-live="polite">
          {index + 1} / {count}
        </span>
        <button ref={closeBtn} className="btn btn--ghost" type="button" onClick={onClose}>
          Mbyll
        </button>
      </div>

      <figure className="lightbox__figure" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {item.type === 'video' && item.video ? (
          <video key={item.id} className="lightbox__media" src={item.video} poster={item.full ?? undefined} controls playsInline preload="metadata" width={item.width} height={item.height} aria-describedby={captionId}>
            Shfletuesi yt nuk e mbështet videon.
          </video>
        ) : item.full ? (
          // eslint-disable-next-line @next/next/no-img-element -- private, session-gated route; next/image would cache it publicly
          <img
            key={item.id}
            className={`lightbox__media${loaded ? ' is-loaded' : ''}`}
            src={item.full}
            alt={item.alt}
            width={item.width}
            height={item.height}
            onLoad={() => setLoadedSrc(item.full)}
            draggable={false}
          />
        ) : null}
        {!loaded ? <span className="lightbox__loading">Duke u ngarkuar…</span> : null}
        <figcaption id={captionId} className="lightbox__caption">
          {item.placeholder ? <span className="tag">Placeholder</span> : null}
          <span>{item.caption || `Kujtimi ${index + 1}`}</span>
        </figcaption>
      </figure>

      {count > 1 ? (
        <>
          <button className="lightbox__nav lightbox__nav--prev" type="button" onClick={prev} aria-label="Kujtimi i mëparshëm">
            ‹
          </button>
          <button className="lightbox__nav lightbox__nav--next" type="button" onClick={next} aria-label="Kujtimi i radhës">
            ›
          </button>
        </>
      ) : null}
    </div>
  )
}
