/** 2D fallback sky for no-WebGL and reduced-motion. Deterministic so SSR and client match. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20060314)
const STARS = Array.from({ length: 260 }, () => ({
  x: rand() * 100,
  y: rand() * 100,
  r: rand() < 0.92 ? 0.05 + rand() * 0.12 : 0.18 + rand() * 0.14,
  o: 0.35 + rand() * 0.65,
}))

export default function StaticSky({ showStar = true }: { showStar?: boolean }) {
  return (
    <div className="static-sky" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="ss-glow">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.15" stopColor="#dce8ff" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#7aa2ff" stopOpacity="0.18" />
            <stop offset="1" stopColor="#7aa2ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#eef3ff" opacity={s.o} />
        ))}
        {showStar ? <circle cx="50" cy="38" r="14" fill="url(#ss-glow)" /> : null}
      </svg>
    </div>
  )
}
