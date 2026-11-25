'use client'

import { useEffect, useState } from 'react'
import Emblem from '../Emblem'

type LetterData = { paragraphs: string[]; draft: boolean; signature: string | null }

/** Animated personal letter: a sealed envelope opens and the paper unfolds; text stays fully readable. */
export default function Letter() {
  const [data, setData] = useState<LetterData | null>(null)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/private/letter', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: LetterData) => alive && setData(d))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  if (error) return <p className="chapter__lead">Letra nuk u ngarkua. Provo të rifreskosh faqen.</p>
  if (!data) return <p className="chapter__lead">Duke ngarkuar letrën…</p>

  const [greeting, ...body] = data.paragraphs
  return (
    <div className={`letter${open ? ' is-open' : ''}`}>
      {!open ? (
        <div className="letter__closed">
          <div className="letter__envelope" aria-hidden="true">
            <span className="letter__seal">
              <Emblem />
            </span>
          </div>
          <button className="btn btn--gold" type="button" onClick={() => setOpen(true)}>
            Hap letrën
          </button>
        </div>
      ) : (
        <article className="letter__paper" aria-label="Letra">
          {data.draft ? <p className="tag letter__draft">Draft · teksti final do të vendoset nga dhuruesi</p> : null}
          <p className="letter__greeting">{greeting}</p>
          {body.map((p, i) => (
            <p key={i} className="letter__p" style={{ ['--i' as string]: i }}>
              {p}
            </p>
          ))}
          <p className="letter__closing">Me shumë dashuri,</p>
          {/* The giver chose to stay unnamed: no signature line unless config/dedication.json sets "giver". */}
          {data.signature ? <p className="letter__signature">{data.signature}</p> : null}
        </article>
      )}
    </div>
  )
}
