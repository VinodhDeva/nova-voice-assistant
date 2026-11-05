import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { useAssistant, type Status } from '../../state/AssistantContext'

type Mode = 'idle' | 'listen' | 'think' | 'speak'

const modeFor = (status: Status, speaking: boolean): Mode =>
  speaking || status === 'speaking'
    ? 'speak'
    : status === 'listening' || status === 'recording' || status === 'transcribing'
      ? 'listen'
      : ['processing', 'tokenizing', 'thinking', 'generating'].includes(status)
        ? 'think'
        : 'idle'

const LABEL: Record<Mode, string> = { idle: 'Nova is idle', listen: 'Nova is listening', think: 'Nova is thinking', speak: 'Nova is speaking' }

interface P {
  x: number
  y: number
  z: number
  /** fountain progress 0..1 (height along the stream) */
  t: number
  speed: number
  angle: number
  spread: number
  /** fixed point on a sphere, for the thinking shape */
  sx: number
  sy: number
  sz: number
  /** home position for idle drift */
  dx: number
  dy: number
  dz: number
  hue: number
  size: number
}

function makeParticles(n: number): P[] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: n }, (_, i) => {
    const sy = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - sy * sy)
    const dx = Math.random() * 2.4 - 1.2
    const dy = Math.random() * 1.4 - 0.7
    const dz = Math.random() * 2 - 1
    return {
      x: dx, y: dy, z: dz,
      t: Math.random(),
      speed: 0.12 + Math.random() * 0.25,
      angle: Math.random() * Math.PI * 2,
      spread: 0.35 + Math.random() * 0.75,
      sx: Math.cos(golden * i) * r, sy, sz: Math.sin(golden * i) * r,
      dx, dy, dz,
      hue: 205 + Math.random() * 60,
      size: Math.random() < 0.08 ? 1.9 : 1.1,
    }
  })
}

/**
 * Blue particle "voice" — a dot fountain over rippling rings, inspired by a reference video.
 * Speaking: dots rise into a tree-like cloud and rings pulse on each spoken word.
 * Listening follows the real mic level; thinking gathers dots into a rotating sphere.
 */
/** Size it with `className` (e.g. h-[240px]) or `height`; the canvas fills the box. */
export function ParticleVoice({ height, className = '' }: { height?: number; className?: string }) {
  const { status, speakingId, turn, micAnalyser } = useAssistant()
  const reduce = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mode = modeFor(status, speakingId !== null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  // Each spoken word (boundary event) kicks the energy and spawns a ripple.
  const pulseRef = useRef(0)
  const spoken = turn?.spokenChars ?? 0
  useEffect(() => {
    if (spoken > 0) pulseRef.current += 1
  }, [spoken])

  // Mode is read from a ref so particles morph between shapes; only a still frame needs redrawing per mode.
  const stillKey = reduce ? mode : null

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const mobile = canvas.clientWidth < 640
    const parts = makeParticles(mobile ? 1600 : 4000)
    const rings: { r: number; a: number }[] = []
    let energy = 0
    let seenPulse = pulseRef.current
    let lastRing = 0
    let raf = 0
    let prev = performance.now()
    let freq: Uint8Array<ArrayBuffer> | null = null

    const micLevel = () => {
      const node = micAnalyser.current
      if (!node) return 0
      if (!freq || freq.length !== node.frequencyBinCount) freq = new Uint8Array(node.frequencyBinCount)
      node.getByteFrequencyData(freq)
      let sum = 0
      for (let i = 0; i < 64; i++) sum += freq[i]
      return Math.min(1, sum / (64 * 140))
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const m = modeRef.current
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Energy: speech pulses + a soft rhythm, mic level, or calm.
      let target = 0.08
      if (m === 'speak') {
        if (pulseRef.current !== seenPulse) {
          seenPulse = pulseRef.current
          energy = Math.min(1.3, energy + 0.35)
          rings.push({ r: 0.05, a: 0.9 })
        }
        target = 0.55 + 0.15 * Math.sin(now / 260) * Math.sin(now / 610)
      } else if (m === 'listen') target = 0.15 + micLevel() * 1.1
      else if (m === 'think') target = 0.35
      energy += (target - energy) * Math.min(1, dt * 4)

      // Ambient ripples; faster and brighter with energy.
      if (now - lastRing > 1400 - energy * 900) {
        rings.push({ r: 0.05, a: 0.35 + energy * 0.4 })
        lastRing = now
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2
      const floor = h * 0.8
      const scale = Math.min(w * 0.42, h * 0.62)
      const rot = now / 9000

      // Rings: flattened ellipses on the "water" plane.
      ctx.lineWidth = 1
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]
        ring.r += dt * (0.35 + energy * 0.5)
        ring.a -= dt * 0.28
        if (ring.a <= 0 || ring.r > 1.6) {
          rings.splice(i, 1)
          continue
        }
        ctx.strokeStyle = `hsla(215, 95%, 65%, ${ring.a * 0.75})`
        ctx.beginPath()
        ctx.ellipse(cx, floor, ring.r * scale, ring.r * scale * 0.22, 0, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Dots, additively blended so dense areas glow.
      ctx.globalCompositeOperation = 'lighter'
      const ease = Math.min(1, dt * (m === 'think' ? 2.2 : 3))
      const cosR = Math.cos(rot)
      const sinR = Math.sin(rot)
      for (const p of parts) {
        let tx: number, ty: number, tz: number
        if (m === 'speak' || m === 'listen') {
          // Fountain: a thin trunk rising from the rings that blooms into a wide, drooping canopy.
          p.t += dt * p.speed * (0.4 + energy)
          if (p.t > 1) p.t -= 1
          const rise = m === 'speak' ? 0.62 + energy * 0.22 : 0.35 + energy * 0.45
          const up = 1 - Math.pow(1 - p.t, 1.8) // more dots spend time high up, in the canopy
          const radius = (0.02 + Math.pow(p.t, 2.6) * 1.35 * p.spread) * (m === 'speak' ? 1 : 0.7)
          const a = p.angle + p.t * 1.6
          tx = Math.cos(a) * radius
          tz = Math.sin(a) * radius * 0.8
          ty = -up * rise + radius * radius * 0.3
        } else if (m === 'think') {
          const r = 0.42 + Math.sin(now / 500 + p.angle * 3) * 0.02
          tx = p.sx * r
          ty = p.sy * r - 0.25
          tz = p.sz * r
        } else {
          tx = p.dx + Math.sin(now / 3000 + p.angle) * 0.05
          ty = p.dy * 0.6 - 0.1 + Math.cos(now / 3700 + p.angle) * 0.05
          tz = p.dz
        }
        p.x += (tx - p.x) * ease
        p.y += (ty - p.y) * ease
        p.z += (tz - p.z) * ease

        // Rotate around the vertical axis, then project.
        const x = p.x * cosR - p.z * sinR
        const z = p.x * sinR + p.z * cosR
        const persp = 2.4 / (2.4 + z)
        const sx = cx + x * scale * persp
        const sy = floor + p.y * scale * persp - scale * 0.02
        if (sy < -4 || sy > h + 4) continue
        const twinkle = 0.55 + 0.45 * Math.sin(now / 400 + p.angle * 7)
        const alpha = (m === 'idle' ? 0.4 : 0.75 + energy * 0.3) * twinkle * persp
        ctx.fillStyle = `hsla(${p.hue}, 95%, ${60 + energy * 12}%, ${Math.min(1, alpha)})`
        const s = p.size * persp * (m === 'speak' ? 1.35 : 1)
        ctx.fillRect(sx - s / 2, sy - s / 2, s, s)
        // A few larger, faint halos give the cloud its glow.
        if (p.size > 1.5 && m !== 'idle') {
          ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${Math.min(1, alpha) * 0.12})`
          ctx.beginPath()
          ctx.arc(sx, sy, s * 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      if (!reduce) raf = requestAnimationFrame(frame)
    }

    if (reduce) {
      // Reduced motion: settle the shape for the current mode and draw one still frame.
      for (let i = 0; i < 60; i++) frame(prev + 16 * (i + 1))
    } else raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [reduce, micAnalyser, stillKey])

  return (
    <div className={`relative overflow-hidden rounded-[20px] border border-line/50 bg-[radial-gradient(ellipse_at_50%_85%,rgba(40,70,160,0.35),transparent_65%)] bg-bg ${className}`} style={{ height }}>
      <canvas ref={canvasRef} className="block h-full w-full" role="img" aria-label={LABEL[mode]} data-mode={mode} />
    </div>
  )
}
