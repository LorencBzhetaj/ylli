'use client'

import { useEffect, useState } from 'react'
import Emblem from '../Emblem'

type View =
  | { configured: false; now: string }
  | { configured: true; locked: true; unlockAt: string; now: string }
  | { configured: true; locked: false; unlockAt: string; title: string; message: string; hasVoice: boolean; now: string }

const MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor']
function dateSq(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Tirane', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(iso))
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return `${g('day')} ${MONTHS[g('month') - 1]} ${g('year')}`
}

export default function Capsule() {
  const [view, setView] = useState<View | null>(null)
  const [error, setError] = useState(false)
  const [voice, setVoice] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/private/capsule', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: View) => alive && setView(d))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  if (error) return <p className="chapter__lead">Kapsula nuk u ngarkua. Provo të rifreskosh faqen.</p>
  if (!view) return <p className="chapter__lead">Duke kontrolluar kapsulën…</p>

  if (!view.configured) {
    return (
      <div className="capsule">
        <p className="chapter__lead">Kapsula e kohës nuk është krijuar ende.</p>
      </div>
    )
  }

  if (view.locked) {
    const days = Math.max(1, Math.ceil((Date.parse(view.unlockAt) - Date.parse(view.now)) / 86_400_000))
    return (
      <div className="capsule capsule--locked">
        <div className="capsule__orb" aria-hidden="true">
          <Emblem />
        </div>
        <p className="capsule__when">
          Do të hapet më <strong>{dateSq(view.unlockAt)}</strong>
        </p>
        <p className="capsule__count">
          edhe {days} ditë
        </p>
        <p className="capsule__note">
          Mesazhi ruhet te serveri dhe dërgohet vetëm pas kësaj date. Deri atëherë, as faqja nuk e njeh përmbajtjen.
        </p>
      </div>
    )
  }

  return (
    <div className="capsule capsule--open">
      <h3 className="capsule__title">{view.title}</h3>
      <p className="capsule__message">{view.message}</p>
      {view.hasVoice ? (
        voice ? (
          <audio className="capsule__audio" src="/api/private/audio/capsule" controls preload="metadata" autoPlay={false}>
            Shfletuesi yt nuk e mbështet audion.
          </audio>
        ) : (
          <button className="btn" type="button" onClick={() => setVoice(true)}>
            ♪ Dëgjo mesazhin zanor
          </button>
        )
      ) : null}
      <p className="capsule__note">U hap më {dateSq(view.unlockAt)}.</p>
    </div>
  )
}
