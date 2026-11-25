'use client'

import { useEffect, useRef, useState } from 'react'

/** Optional background music. Never autoplays: it starts only when the viewer presses the button. */
export default function MusicToggle() {
  const [info, setInfo] = useState<{ url: string; placeholder: boolean } | null>(null)
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/private/audio', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { music: { url: string; placeholder: boolean } | null } | null) => alive && setInfo(d?.music ?? null))
      .catch(() => {})
    return () => {
      alive = false
      audio.current?.pause()
    }
  }, [])

  if (!info) return null

  const toggle = async () => {
    if (!audio.current) {
      const a = new Audio(info.url)
      a.loop = true
      a.volume = 0.5
      a.preload = 'none'
      a.addEventListener('pause', () => setPlaying(false))
      a.addEventListener('play', () => setPlaying(true))
      audio.current = a
    }
    if (audio.current.paused) await audio.current.play().catch(() => setPlaying(false))
    else audio.current.pause()
  }

  return (
    <button
      className="btn btn--ghost"
      type="button"
      onClick={toggle}
      aria-pressed={playing}
    >
      {playing ? '♪ Ndalo muzikën' : '♪ Muzika'}
      {info.placeholder ? <span className="music-placeholder"> · provë</span> : null}
    </button>
  )
}
