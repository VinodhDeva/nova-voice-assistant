import { useEffect, useRef } from 'react'

interface Props {
  /** Live mic analyser; when absent and `active`, a synthetic voice-like wave is drawn. */
  analyser?: React.RefObject<AnalyserNode | null>
  active: boolean
  bars?: number
  height?: number
  colors?: [string, string]
  className?: string
}

/** Canvas bar waveform. Drawn per frame without React re-renders. */
export function AudioWaveform({ analyser, active, bars = 48, height = 56, colors = ['#5b8cff', '#e7a8ff'], className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    const levels = new Float32Array(bars)
    let data: Uint8Array<ArrayBuffer> | null = null

    const draw = (t: number) => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr
        canvas.height = height * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, height)
      const node = analyser?.current
      if (node) {
        if (!data || data.length !== node.frequencyBinCount) data = new Uint8Array(node.frequencyBinCount)
        node.getByteFrequencyData(data)
      }
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, colors[0])
      grad.addColorStop(1, colors[1])
      ctx.fillStyle = grad
      const gap = 3
      const bw = Math.max(2, (w - gap * (bars - 1)) / bars)
      for (let i = 0; i < bars; i++) {
        let target = 0.04
        if (node && data) {
          // Voice energy lives in the low bins; mirror around the centre.
          const k = Math.abs(i - bars / 2) / (bars / 2)
          target = Math.max(0.04, data[Math.floor(k * data.length * 0.35)] / 255)
        } else if (activeRef.current) {
          const env = Math.sin((i / bars) * Math.PI)
          target = 0.1 + env * (0.45 + 0.35 * Math.sin(t / 180 + i * 0.6) * Math.sin(t / 470 + i * 0.23))
        }
        levels[i] += (target - levels[i]) * 0.25
        const h = Math.max(2, levels[i] * height)
        const x = i * (bw + gap)
        ctx.beginPath()
        ctx.roundRect(x, (height - h) / 2, bw, h, bw / 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- compare colours by value
  }, [analyser, bars, height, colors[0], colors[1]])

  return <canvas ref={ref} className={`w-full ${className}`} style={{ height }} aria-hidden />
}
