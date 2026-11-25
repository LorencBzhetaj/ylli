'use client'

import type { PublicGalleryItem } from '@/lib/gallery'

/** 2D fallback (no WebGL, reduced motion, or chosen by the viewer). Photos keep their own aspect ratio. */
export default function Gallery2D({ items, onOpen }: { items: PublicGalleryItem[]; onOpen: (i: number) => void }) {
  return (
    <ol className="g2d" aria-label="Kujtimet">
      {items.map((it, i) => (
        <li key={it.id} className="g2d__item" style={{ ['--ar' as string]: `${it.width} / ${it.height}` }}>
          <button type="button" className="g2d__btn" onClick={() => onOpen(i)} aria-label={`Hap kujtimin ${i + 1}${it.caption ? `: ${it.caption}` : ''}`}>
            {it.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- private, session-gated route
              <img src={it.thumb} alt="" width={it.width} height={it.height} loading="lazy" decoding="async" draggable={false} />
            ) : (
              <span className="g2d__noimg" />
            )}
            {it.type === 'video' ? <span className="g2d__play" aria-hidden="true">▶</span> : null}
          </button>
          <p className="g2d__caption">
            {it.placeholder ? <span className="tag">Placeholder</span> : null} {it.caption}
          </p>
        </li>
      ))}
    </ol>
  )
}
