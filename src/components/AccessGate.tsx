'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import Emblem from './Emblem'

export default function AccessGate({ configured }: { configured: boolean }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(configured ? '' : 'Shërbimi nuk është konfiguruar ende (mungon ACCESS_CODE_HASH / SESSION_SECRET).')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; retryAfter?: number }
      if (res.ok && data.ok) {
        router.replace('/experience')
        return
      }
      if (data.error === 'rate_limited') {
        const min = Math.max(1, Math.ceil((data.retryAfter ?? 60) / 60))
        setMsg(`Shumë përpjekje. Provo përsëri pas ${min} minutash.`)
      } else if (data.error === 'not_configured') {
        setMsg('Shërbimi nuk është konfiguruar ende.')
      } else {
        setMsg('Kodi nuk është i saktë.')
      }
    } catch {
      setMsg('Lidhja dështoi. Provo përsëri.')
    }
    setBusy(false)
  }

  return (
    <main className="gate">
      <div className="gate__card fade-in">
        <Emblem className="gate__emblem" />
        <p className="eyebrow">Një dhuratë private</p>
        <h1 className="display gate__title">Nadia</h1>
        <p className="gate__subtitle">Një yll për ty</p>
        <form onSubmit={onSubmit} noValidate>
          <label htmlFor="code">Kodi i hyrjes</label>
          <input
            id="code"
            name="code"
            type="password"
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-describedby="gate-msg"
            disabled={!configured}
            required
          />
          <button className="btn btn--gold" type="submit" disabled={busy || !configured}>
            {busy ? 'Duke kontrolluar…' : 'Hyr'}
          </button>
          <p id="gate-msg" className="gate__msg" role="status" aria-live="polite">
            {msg}
          </p>
        </form>
        <p className="gate__note">Kjo faqe është private dhe nuk indeksohet.</p>
      </div>
    </main>
  )
}
