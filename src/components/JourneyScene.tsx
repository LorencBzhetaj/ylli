'use client'

/**
 * Earth-to-Regulus journey. Fully procedural (no textures, no AI imagery).
 * Artistic visualisation — distances and speeds are NOT to scale.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type ScenePhase = 'journey' | 'reveal' | 'finale'

type Props = {
  phase: ScenePhase
  reducedMotion: boolean
  /** Increment to restart the journey from Earth. */
  runId: number
  onArrive: () => void
  onError: () => void
}

const STAR_POS = new THREE.Vector3(0, 0.4, -210)
const JOURNEY_SECONDS = 16

// ——— shared GLSL value noise (hash-based, no third-party code) ———
const NOISE = /* glsl */ `
float hash(vec3 p){ p = fract(p*0.3183099 + .1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
`

/** Uniforms of an object's ShaderMaterial, read through its ref inside useFrame. */
const uniformsOf = (o: THREE.Mesh | THREE.Points | null) => (o?.material as THREE.ShaderMaterial | undefined)?.uniforms

/** Seeded PRNG so the sky is identical on every visit (and render stays pure). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

// ——— Camera path ———
const PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(2.1, 0.55, 2.9),
    new THREE.Vector3(2.8, 1.5, -3.2),
    new THREE.Vector3(-1.5, 1.6, -30),
    new THREE.Vector3(3.5, -0.6, -85),
    new THREE.Vector3(-2.5, 1.2, -140),
    new THREE.Vector3(0.6, 0.6, -186),
    new THREE.Vector3(0, 0.45, -199.5),
  ],
  false,
  'centripetal',
)
const EARTH_LOOK = new THREE.Vector3(0, 0, 0)

function CameraRig({ phase, reducedMotion, runId, onArrive }: Omit<Props, 'onError'>) {
  const { camera } = useThree()
  // Mounted mid-story (e.g. returning from the gallery to the finale) → start at the star, not at Earth.
  const startsAtEnd = reducedMotion || phase !== 'journey'
  const progress = useRef(startsAtEnd ? 1 : 0)
  const recede = useRef(0)
  const arrived = useRef(startsAtEnd)
  const phaseRef = useRef(phase)
  const look = useMemo(() => new THREE.Vector3(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const back = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    // Restart only when the parent bumps runId (replay) or motion preference changes.
    const end = reducedMotion || phaseRef.current !== 'journey'
    progress.current = end ? 1 : 0
    recede.current = 0
    arrived.current = end
  }, [runId, reducedMotion])

  useFrame((_, rawDt) => {
    // Clamp only real stalls (tab switch); low frame rates must not slow the journey down.
    const dt = Math.min(rawDt, 0.25)
    if (phase === 'journey' && !arrived.current) {
      progress.current = Math.min(1, progress.current + dt / JOURNEY_SECONDS)
      if (progress.current >= 1) {
        arrived.current = true
        onArrive()
      }
    }
    if (phase === 'reveal' && !arrived.current) {
      // "Kalo" (skip) pressed — jump to the end.
      progress.current = 1
      arrived.current = true
    }
    const recedeTarget = phase === 'finale' ? 1 : 0
    recede.current = reducedMotion
      ? recedeTarget
      : THREE.MathUtils.damp(recede.current, recedeTarget, 0.45, dt)

    const t = smootherstep(progress.current)
    PATH.getPointAt(t, pos)
    // Look at Earth first, then turn smoothly toward the star.
    const lookBlend = THREE.MathUtils.smoothstep(t, 0.02, 0.22)
    look.copy(EARTH_LOOK).lerp(STAR_POS, lookBlend)
    // On arrival, tilt down so the star rests in the upper part of the frame, above the text.
    look.setY(look.y - 3.6 * THREE.MathUtils.smoothstep(t, 0.82, 1) - 14 * recede.current)

    // Finale: pull back and up so the star becomes a distant point among others.
    back.set(-6 * recede.current, 3.5 * recede.current, 55 * recede.current)
    pos.add(back)
    camera.position.copy(pos)
    camera.lookAt(look)
  })
  return null
}

// ——— Earth (procedural) ———
function Earth() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uSun: { value: new THREE.Vector3(-0.6, 0.35, 0.75).normalize() }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vP; varying vec3 vView;
          void main(){
            vN = normalize(normalMatrix * normal);
            vP = position;
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun; uniform float uTime;
          varying vec3 vN; varying vec3 vP; varying vec3 vView;
          ${NOISE}
          void main(){
            vec3 p = normalize(vP);
            float land = smoothstep(0.53, 0.56, fbm(p*3.1 + 3.1) * 0.85 + fbm(p*9.0) * 0.15);
            float ice = smoothstep(0.82, 0.9, abs(p.y));
            vec3 ocean = mix(vec3(0.01,0.05,0.16), vec3(0.03,0.13,0.32), fbm(p*6.0));
            vec3 ground = mix(vec3(0.10,0.17,0.08), vec3(0.32,0.27,0.17), fbm(p*7.0+1.7));
            vec3 col = mix(ocean, ground, land);
            col = mix(col, vec3(0.85,0.9,0.95), ice);
            float clouds = smoothstep(0.58, 0.8, fbm(p*4.2 + vec3(uTime*0.004,0.0,0.0)));
            col = mix(col, vec3(0.9), clouds*0.6);
            vec3 sunV = normalize((viewMatrix * vec4(uSun,0.0)).xyz);
            float d = dot(normalize(vN), sunV);
            float lit = smoothstep(-0.15, 0.35, d);
            // faint warm city lights on the night side, land only
            float city = land * (1.0-lit) * smoothstep(0.7, 0.76, fbm(p*70.0)) * 0.35;
            vec3 c = col * (0.03 + 1.05*lit) + vec3(1.0,0.75,0.45)*city;
            float spec = pow(max(dot(reflect(-sunV, normalize(vN)), vView),0.0), 28.0) * (1.0-land) * lit;
            c += vec3(0.55,0.65,0.8) * spec * 0.4;
            float rim = pow(1.0 - max(dot(normalize(vN), vView),0.0), 3.0);
            c += vec3(0.25,0.5,1.0) * rim * (0.04 + 0.4*lit);
            gl_FragColor = vec4(c,1.0);
          }`,
      }),
    [],
  )
  const atmo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vView;
          void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vView = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: /* glsl */ `
          varying vec3 vN; varying vec3 vView;
          // BackSide shell: dot(vN,vView) runs from ~-0.33 at Earth's limb to 0 at the shell edge.
          void main(){ float i = pow(clamp(-dot(vN, vView) / 0.33, 0.0, 1.0), 2.2); gl_FragColor = vec4(0.32,0.56,1.0,1.0) * i * 0.55; }`,
      }),
    [],
  )
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    m.rotation.y += dt * 0.02
    uniformsOf(m)!.uTime.value += dt
  })
  useEffect(() => () => { mat.dispose(); atmo.dispose() }, [mat, atmo])
  return (
    <group>
      <mesh ref={ref} material={mat}>
        <sphereGeometry args={[1, 96, 96]} />
      </mesh>
      <mesh material={atmo} scale={1.06}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
    </group>
  )
}

// ——— Star field ———
function StarField({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const seed = new Float32Array(count)
    const random = mulberry32(14032006)
    const palette = [new THREE.Color('#cfdcff'), new THREE.Color('#ffffff'), new THREE.Color('#fff1dc'), new THREE.Color('#ffd9b0'), new THREE.Color('#aecbff')]
    for (let i = 0; i < count; i++) {
      // Tube around the path plus a far shell for depth.
      const far = i % 4 === 0
      const z = far ? (random() * 2 - 1) * 600 : 40 - random() * 300
      const r = far ? 280 + random() * 200 : 6 + Math.pow(random(), 0.6) * 90
      const a = random() * Math.PI * 2
      pos.set([Math.cos(a) * r, Math.sin(a) * r * 0.8, z], i * 3)
      const c = palette[(random() * palette.length) | 0]
      col.set([c.r, c.g, c.b], i * 3)
      size[i] = random() < 0.97 ? 0.6 + random() * 1.2 : 2 + random() * 2.2
      seed[i] = random() * 100
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uTwinkle: { value: reducedMotion ? 0 : 1 } },
      vertexShader: /* glsl */ `
        attribute float aSize; attribute float aSeed;
        uniform float uTime; uniform float uPx; uniform float uTwinkle;
        varying vec3 vColor; varying float vAlpha;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          float tw = 1.0 + uTwinkle * 0.25 * sin(uTime*1.3 + aSeed*7.0);
          gl_PointSize = clamp(aSize * uPx * tw * (140.0 / -mv.z), 0.8, 7.0 * uPx);
          vAlpha = smoothstep(0.5, 6.0, -mv.z);
          vColor = color;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vAlpha;
        void main(){
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          float a = smoothstep(0.5, 0.0, r);
          a = a*a;
          gl_FragColor = vec4(vColor, a * vAlpha);
        }`,
    })
    return { geometry: g, material: m }
  }, [count, reducedMotion])

  const ref = useRef<THREE.Points>(null)
  const { gl } = useThree()
  useFrame((_, dt) => {
    const u = uniformsOf(ref.current)
    if (!u) return
    u.uTime.value += dt
    u.uPx.value = gl.getPixelRatio()
  })
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}

// ——— Nebula clouds: large procedural billboards at varied depth ———
const NEBULAE: { p: [number, number, number]; s: number; c1: string; c2: string; seed: number }[] = [
  { p: [-26, 10, -45], s: 70, c1: '#1d3a8a', c2: '#6b4fa3', seed: 1.3 },
  { p: [30, -12, -70], s: 80, c1: '#123070', c2: '#3f7fd1', seed: 4.1 },
  { p: [-18, -16, -105], s: 90, c1: '#2a2a78', c2: '#a0628f', seed: 7.7 },
  { p: [24, 18, -130], s: 85, c1: '#0f2a66', c2: '#5a86d8', seed: 2.9 },
  { p: [-30, 4, -165], s: 100, c1: '#1b2f7a', c2: '#7d5bb0', seed: 9.2 },
  { p: [16, -8, -230], s: 140, c1: '#132a6e', c2: '#4f78c9', seed: 5.5 },
  { p: [-40, 22, -260], s: 160, c1: '#1e2466', c2: '#8b5e9e', seed: 3.3 },
]

function Nebula({ p, s, c1, c2, seed }: (typeof NEBULAE)[number]) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) }, uSeed: { value: seed }, uFade: { value: 1 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uC1; uniform vec3 uC2; uniform float uSeed; uniform float uFade;
          varying vec2 vUv;
          ${NOISE}
          void main(){
            vec2 q = vUv - 0.5;
            float r = length(q);
            vec3 p = vec3(q*3.0, uSeed);
            float n = fbm(p + fbm(p*1.7 + uSeed)*1.4);
            float dust = fbm(p*4.0 + 11.0);
            float mask = smoothstep(0.5, 0.05, r) * smoothstep(0.35, 0.75, n);
            vec3 col = mix(uC1, uC2, smoothstep(0.45, 0.8, n));
            col *= 1.0 - smoothstep(0.55, 0.85, dust) * 0.6; // dark dust lanes
            gl_FragColor = vec4(col, mask * 0.42 * uFade);
          }`,
      }),
    [c1, c2, seed],
  )
  const { camera } = useThree()
  useFrame(() => {
    const m = ref.current
    if (!m) return
    m.quaternion.copy(camera.quaternion)
    // fade out as the camera passes close to avoid hard clipping
    const d = m.position.distanceTo(camera.position)
    uniformsOf(m)!.uFade.value = THREE.MathUtils.smoothstep(d, s * 0.25, s * 0.7)
  })
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <mesh ref={ref} position={p} material={mat}>
      <planeGeometry args={[s, s]} />
    </mesh>
  )
}

// ——— Regulus: natural blue-white point source with soft glow ———
function Regulus() {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; varying vec2 vUv;
          void main(){
            vec2 q = (vUv - 0.5) * 2.0;
            float r = length(q);
            float core = exp(-r*r*900.0);
            float halo = exp(-r*9.0) * 0.55 + exp(-r*3.2) * 0.12;
            // very restrained diffraction spikes
            float spikes = (exp(-abs(q.x)*160.0) + exp(-abs(q.y)*160.0)) * exp(-r*4.0) * 0.35;
            float pulse = 1.0 + 0.03*sin(uTime*0.9);
            vec3 col = mix(vec3(0.62,0.75,1.0), vec3(1.0), clamp(core*1.5 + exp(-r*22.0), 0.0, 1.0));
            float a = (core + halo + spikes) * pulse;
            gl_FragColor = vec4(col * a, clamp(a, 0.0, 1.0));
          }`,
      }),
    [],
  )
  const { camera } = useThree()
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    uniformsOf(m)!.uTime.value += dt
    m.quaternion.copy(camera.quaternion)
  })
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <group position={STAR_POS}>
      <mesh ref={ref} material={mat}>
        <planeGeometry args={[14, 14]} />
      </mesh>
      <pointLight color="#cfe0ff" intensity={2} distance={60} />
    </group>
  )
}

function Scene(props: Omit<Props, 'onError'>) {
  const { size } = useThree()
  const mobile = size.width < 700
  return (
    <>
      <color attach="background" args={['#030611']} />
      <CameraRig {...props} />
      <Earth />
      <StarField count={mobile ? 5000 : 9000} reducedMotion={props.reducedMotion} />
      {(mobile ? NEBULAE.slice(0, 5) : NEBULAE).map((n) => (
        <Nebula key={n.seed} {...n} />
      ))}
      <Regulus />
    </>
  )
}

export default function JourneyScene(props: Props) {
  return (
    <Canvas
      className="journey-canvas"
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 50, near: 0.05, far: 2000, position: [2.1, 0.55, 2.9] }}
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
      <Scene phase={props.phase} reducedMotion={props.reducedMotion} runId={props.runId} onArrive={props.onArrive} />
    </Canvas>
  )
}
