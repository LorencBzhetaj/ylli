'use client'

/**
 * "Yjësia e kujtimeve" — photos float as planes at different depths, joined by thin gold lines.
 * Camera follows a continuous focus value driven by wheel / touch-drag / buttons / keys.
 * Only textures near the focus are loaded (fewer on mobile) and they are disposed when far away.
 */
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { PublicGalleryItem } from '@/lib/gallery'

type Props = {
  items: PublicGalleryItem[]
  /** Nearest memory, as last reported by the camera (drives texture streaming). */
  focus: number
  /** Explicit navigation command from buttons/keys; n changes on every request. */
  goTo: { i: number; n: number }
  onFocusChange: (i: number) => void
  onOpen: (i: number) => void
  onError: () => void
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SPACING = 5.5

export function layout(count: number, narrow: boolean): THREE.Vector3[] {
  const r = mulberry32(31415)
  const spread = narrow ? 0.55 : 1
  return Array.from({ length: count }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1
    return new THREE.Vector3(side * (1.5 + 1.3 * r()) * spread, (r() - 0.5) * 2.2, -i * SPACING - r() * 1.2)
  })
}

function planeSize(item: PublicGalleryItem): [number, number] {
  const aspect = item.width / item.height || 1
  const h = aspect >= 1 ? 2.3 : 2.9
  let w = h * aspect
  if (w > 3.8) w = 3.8
  return [w, w / aspect]
}

const loader = new THREE.TextureLoader()

/** Camera distance in front of the focused memory (further back on portrait screens). */
const cameraDistance = (w: number, h: number) => (w / h < 0.8 ? 10.5 : 8.2)

function Memory({ item, position, active, index, onOpen, maxAniso }: { item: PublicGalleryItem; position: THREE.Vector3; active: boolean; index: number; onOpen: (i: number) => void; maxAniso: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const [hover, setHover] = useState(false)
  const [w, h] = planeSize(item)

  useEffect(() => {
    if (!active || !item.thumb) return
    let alive = true
    let loaded: THREE.Texture | null = null
    loader.loadAsync(item.thumb).then(
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = Math.min(4, maxAniso)
        loaded = t
        if (alive) setTex(t)
        else t.dispose()
      },
      () => {},
    )
    return () => {
      alive = false
      loaded?.dispose()
      setTex(null)
    }
  }, [active, item.thumb, maxAniso])

  useEffect(() => {
    if (!hover) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hover])

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 8) return // was a drag, not a tap
    onOpen(index)
  }

  // Fade memories the camera has already passed, so they never fill the screen edge.
  const group = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  useFrame(() => {
    const g = group.current
    if (!g) return
    const dist = cameraDistance(size.width, size.height)
    const fade = THREE.MathUtils.smoothstep(camera.position.z - position.z, dist - 4, dist - 1.2)
    g.visible = fade > 0.01
    g.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined
      if (!m) return
      if (m.userData.base === undefined) m.userData.base = m.opacity
      m.transparent = true
      m.opacity = m.userData.base * fade
    })
  })

  const border = 0.05
  return (
    <group ref={group} position={position} scale={hover ? 1.03 : 1}>
      {/* thin gold frame */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[w + border * 2, h + border * 2]} />
        <meshBasicMaterial key={hover ? 'h' : 'n'} color="#c9ac79" transparent opacity={hover ? 0.95 : 0.6} />
      </mesh>
      <mesh onClick={click} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
        <planeGeometry args={[w, h]} />
        {/* key → a fresh material when the texture arrives (adding a map needs a shader recompile) */}
        {tex ? <meshBasicMaterial key={tex.uuid} map={tex} toneMapped={false} /> : <meshBasicMaterial key="empty" color="#0c1832" />}
      </mesh>
      {item.type === 'video' ? <PlayBadge /> : null}
    </group>
  )
}

function PlayBadge() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = 'rgba(3,6,17,0.55)'
    g.beginPath()
    g.arc(64, 64, 58, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#c9ac79'
    g.lineWidth = 4
    g.stroke()
    g.fillStyle = '#f6eddb'
    g.beginPath()
    g.moveTo(52, 40)
    g.lineTo(92, 64)
    g.lineTo(52, 88)
    g.closePath()
    g.fill()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <mesh position={[0, 0, 0.02]} raycast={() => null}>
      <planeGeometry args={[0.6, 0.6]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  )
}

function GoldLines({ points }: { points: THREE.Vector3[] }) {
  const geometry = useMemo(() => {
    const segs: number[] = []
    const push = (a: THREE.Vector3, b: THREE.Vector3) => segs.push(a.x, a.y, a.z - 0.05, b.x, b.y, b.z - 0.05)
    for (let i = 0; i < points.length - 1; i++) push(points[i], points[i + 1])
    for (let i = 0; i < points.length - 2; i += 3) push(points[i], points[i + 2])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3))
    return g
  }, [points])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <lineSegments geometry={geometry} raycast={() => null}>
      <lineBasicMaterial color="#c9ac79" transparent opacity={0.5} />
    </lineSegments>
  )
}

const dotTexture = (() => {
  let t: THREE.CanvasTexture | null = null
  return () => {
    if (t) return t
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const g = c.getContext('2d')!
    const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 32, 32)
    t = new THREE.CanvasTexture(c)
    return t
  }
})()

function Backdrop({ depth }: { depth: number }) {
  const geometry = useMemo(() => {
    const r = mulberry32(2006)
    const n = 2500
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (r() - 0.5) * 120
      pos[i * 3 + 1] = (r() - 0.5) * 80
      pos[i * 3 + 2] = 10 - r() * (depth + 60)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [depth])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <points geometry={geometry} raycast={() => null}>
      <pointsMaterial color="#dce8ff" size={0.14} map={dotTexture()} sizeAttenuation transparent opacity={0.8} depthWrite={false} />
    </points>
  )
}

function Rig({ points, goTo, onFocusChange }: { points: THREE.Vector3[]; goTo: Props['goTo']; onFocusChange: (i: number) => void }) {
  const { camera, size, gl } = useThree()
  const target = useRef(goTo.i)
  const current = useRef(goTo.i)
  const lastInput = useRef(0)
  const reported = useRef(goTo.i)
  const tmpA = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const max = points.length - 1

  // Buttons / keys from the parent request an exact memory.
  useEffect(() => {
    target.current = goTo.i
    lastInput.current = 0
  }, [goTo])

  // Wheel + touch drag scroll continuously through the constellation.
  useEffect(() => {
    const el = gl.domElement
    const clamp = (v: number) => Math.max(0, Math.min(max, v))
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      target.current = clamp(target.current + (e.deltaY + e.deltaX) * 0.0028)
      lastInput.current = performance.now()
    }
    let startY = 0
    let startX = 0
    let startT = 0
    const onDown = (e: PointerEvent) => {
      startY = e.clientY
      startX = e.clientX
      startT = target.current
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) return
      const d = (startY - e.clientY) / 160 + (startX - e.clientX) / 220
      target.current = clamp(startT + d)
      lastInput.current = performance.now()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
    }
  }, [gl, max])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.25)
    // Settle on the nearest memory shortly after free scrolling stops.
    if (performance.now() - lastInput.current > 450) target.current = Math.round(target.current)
    current.current = THREE.MathUtils.damp(current.current, target.current, 4, dt)

    const f = current.current
    const i0 = Math.floor(f)
    const i1 = Math.min(max, i0 + 1)
    tmpA.copy(points[i0]).lerp(points[i1], f - i0)
    const dist = cameraDistance(size.width, size.height)
    camera.position.set(tmpA.x * 0.3, tmpA.y * 0.4 + 0.5, tmpA.z + dist)
    look.set(tmpA.x * 0.75, tmpA.y * 0.8, tmpA.z - 1.5)
    camera.lookAt(look)

    const nearest = Math.round(f)
    if (nearest !== reported.current) {
      reported.current = nearest
      onFocusChange(nearest)
    }
  })
  return null
}

function Scene({ items, focus, goTo, onFocusChange, onOpen }: Omit<Props, 'onError'>) {
  const { size, gl } = useThree()
  const narrow = size.width < 700
  const points = useMemo(() => layout(items.length, narrow), [items.length, narrow])
  const win = narrow ? 2 : 3
  const maxAniso = gl.capabilities.getMaxAnisotropy()
  return (
    <>
      <color attach="background" args={['#030611']} />
      <Rig points={points} goTo={goTo} onFocusChange={onFocusChange} />
      <Backdrop depth={items.length * SPACING} />
      <GoldLines points={points} />
      {items.map((it, i) => (
        <Memory key={it.id} item={it} index={i} position={points[i]} active={Math.abs(i - focus) <= win} onOpen={onOpen} maxAniso={maxAniso} />
      ))}
    </>
  )
}

export default function MemoryConstellation(props: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
      camera={{ fov: 50, near: 0.1, far: 400, position: [0, 0, 7] }}
      style={{ touchAction: 'none' }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement
        canvas.addEventListener('webglcontextlost', (e) => {
          // R3F force-loses the context on purpose after unmount; only a loss while on screen is a failure.
          if (!canvas.isConnected) return
          e.preventDefault()
          props.onError()
        })
      }}
      aria-hidden="true"
    >
      <Scene items={props.items} focus={props.focus} goTo={props.goTo} onFocusChange={props.onFocusChange} onOpen={props.onOpen} />
    </Canvas>
  )
}
