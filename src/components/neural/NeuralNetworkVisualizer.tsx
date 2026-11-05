import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { seeded } from '../../lib/text'

interface Props {
  layers?: number[]
  labels?: string[]
  width?: number
  height?: number
  active: boolean
  selected?: number
  onSelect?: (layer: number) => void
  seed?: number
}

/**
 * Educational feed-forward diagram. Weights and activations are simulated:
 * real models have billions of weights that Ollama does not expose.
 */
export function NeuralNetworkVisualizer({ layers = [3, 4, 3, 2], labels, width = 176, height = 99, active, selected, onSelect, seed = 7 }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const padX = labels ? 30 : 8
  const padY = labels ? 22 : 8

  const { nodes, edges } = useMemo(() => {
    const rand = seeded(seed)
    const nodes = layers.flatMap((n, li) =>
      Array.from({ length: n }, (_, ni) => ({
        id: `${li}-${ni}`,
        li,
        x: padX + (li * (width - padX * 2)) / (layers.length - 1),
        y: padY + ((ni + 0.5) * (height - padY * 2 - (labels ? 12 : 0))) / n,
        act: rand(),
      })),
    )
    const edges = nodes.flatMap((a) =>
      nodes.filter((b) => b.li === a.li + 1).map((b) => ({ a, b, w: rand() * 2 - 1 })),
    )
    return { nodes, edges }
  }, [layers, width, height, padX, padY, labels, seed])

  const pulses = useMemo(() => edges.filter((_, i) => i % 3 === 0), [edges])
  const r = width > 300 ? 7 : 4

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label="Simulated neural network with signals flowing between layers">
      <defs>
        <radialGradient id="nn-node">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dcebff" />
        </radialGradient>
      </defs>
      {onSelect &&
        layers.map((_, li) => {
          const x = padX + (li * (width - padX * 2)) / (layers.length - 1)
          return (
            <motion.rect
              key={li}
              x={x - 22}
              y={4}
              width={44}
              height={height - 8}
              rx={12}
              className="cursor-pointer"
              initial={false}
              animate={{ fill: selected === li ? 'rgba(220,235,255,0.08)' : 'rgba(220,235,255,0)', stroke: selected === li ? 'rgba(220,235,255,0.35)' : 'rgba(220,235,255,0)' }}
              whileHover={{ fill: 'rgba(220,235,255,0.05)' }}
              onClick={() => onSelect(li)}
            />
          )
        })}
      {edges.map(({ a, b, w }) => {
        const lit = hover && (hover === a.id || hover === b.id)
        return (
          <line
            key={a.id + b.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={lit ? (w > 0 ? '#9fc0ff' : '#e7a8ff') : '#dcebff'}
            strokeOpacity={lit ? 0.9 : 0.08 + Math.abs(w) * (active ? 0.3 : 0.18)}
            strokeWidth={lit ? 1.5 : 0.6 + Math.abs(w) * 0.8}
            pointerEvents="none"
          />
        )
      })}
      {active &&
        pulses.map(({ a, b }, i) => (
          <motion.circle
            key={`p${i}`}
            r={width > 300 ? 2.5 : 1.6}
            fill="#ffffff"
            initial={{ cx: a.x, cy: a.y, opacity: 0 }}
            animate={{ cx: [a.x, b.x], cy: [a.y, b.y], opacity: [0, 1, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: a.li * 0.45 + (i % 5) * 0.12, repeatDelay: layers.length * 0.3, ease: 'easeInOut' }}
            pointerEvents="none"
          />
        ))}
      {nodes.map((n) => (
        <motion.circle
          key={n.id}
          cx={n.x}
          cy={n.y}
          r={r}
          fill="url(#nn-node)"
          onHoverStart={() => setHover(n.id)}
          onHoverEnd={() => setHover(null)}
          onClick={() => onSelect?.(n.li)}
          className={onSelect ? 'cursor-pointer' : ''}
          animate={active ? { opacity: [0.35, 0.5 + n.act * 0.5, 0.35], scale: [1, 1.25, 1] } : { opacity: 0.85, scale: 1 }}
          transition={active ? { duration: 1.2, repeat: Infinity, delay: n.li * 0.45 + n.act * 0.3 } : { duration: 0.4 }}
          style={{ transformOrigin: `${n.x}px ${n.y}px`, filter: active ? 'drop-shadow(0 0 4px rgba(220,235,255,0.8))' : undefined }}
        />
      ))}
      {labels?.map((l, li) => (
        <text key={l} x={padX + (li * (width - padX * 2)) / (layers.length - 1)} y={height - 4} textAnchor="middle" className="fill-muted font-mono" fontSize={10}>
          {l}
        </text>
      ))}
    </svg>
  )
}
