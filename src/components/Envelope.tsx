'use client'

import { useState } from 'react'
import Emblem from './Emblem'

export default function Envelope({ recipient, onStart }: { recipient: string; onStart: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <main className="envelope-scene">
      <div className={`envelope${open ? ' is-open' : ''}`}>
        <div className="envelope__back" />
        <div className="envelope__letter" aria-hidden={!open}>
          <p className="eyebrow">Për</p>
          <p className="script">{recipient}</p>
          <span className="divider" aria-hidden="true">✦</span>
        </div>
        <div className="envelope__front" />
        <div className="envelope__flap" />
        <button className="seal" type="button" onClick={() => setOpen(true)} aria-label="Hap zarfin">
          <Emblem />
        </button>
      </div>

      <div className="envelope-actions">
        {open ? (
          <>
            <button className="btn btn--gold fade-in fade-in--late" type="button" onClick={onStart}>
              Fillo udhëtimin
            </button>
            <p className="envelope-hint fade-in fade-in--late">Nuk ka zë automatik. Mund ta kalosh animacionin në çdo kohë.</p>
          </>
        ) : (
          <>
            <button className="btn" type="button" onClick={() => setOpen(true)}>
              Hap zarfin
            </button>
            <p className="envelope-hint">Prek vulën e artë</p>
          </>
        )}
      </div>
    </main>
  )
}
