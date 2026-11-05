import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { hashId, showToken } from '../../lib/text'

/** Simulated causal self-attention: recency + content-word bias + deterministic noise, then softmax. */
export function attentionWeights(tokens: string[], q: number) {
  const scores = tokens.map((t, k) => {
    if (k > q) return -Infinity // causal mask: a token can't look at the future
    const content = /\p{L}{4,}/u.test(t) ? 1.1 : 0
    const noise = (hashId(tokens[q] + '|' + t, 997) / 997) * 1.4
    const recency = -0.25 * (q - k)
    return content + noise + recency + (k === q ? 0.6 : 0)
  })
  const max = Math.max(...scores.filter(Number.isFinite))
  const exps = scores.map((s) => (Number.isFinite(s) ? Math.exp(s - max) : 0))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

export function AttentionVisualizer({ tokens, compact = false }: { tokens: string[]; compact?: boolean }) {
  const list = tokens.length ? tokens.slice(0, compact ? 8 : 14) : ['What', ' is', ' AI', '?']
  const [q, setQ] = useState(list.length - 1)
  const query = Math.min(q, list.length - 1)
  const weights = useMemo(() => attentionWeights(list, query), [list, query])
  const matrix = useMemo(() => list.map((_, i) => attentionWeights(list, i)), [list])

  const cell = compact ? 14 : 20
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] text-muted">
          Click a token to see which earlier tokens it <em className="text-accent not-italic">pays attention</em> to.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {list.map((t, i) => {
            const w = weights[i]
            const isQ = i === query
            return (
              <motion.button
                key={i + t}
                onClick={() => setQ(i)}
                whileTap={{ scale: 0.92 }}
                className="relative rounded-md px-2 py-1.5 font-mono text-[11px]"
                animate={{
                  backgroundColor: isQ ? 'rgba(220,235,255,0.9)' : `rgba(164,107,255,${0.08 + w * 0.9})`,
                  color: isQ ? '#18191d' : '#dcebff',
                }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              >
                {showToken(t)}
                {!isQ && i < query && <span className="absolute -top-2 right-0 font-mono text-[8px] text-muted">{Math.round(w * 100)}%</span>}
              </motion.button>
            )
          })}
        </div>
      </div>
      <div className="overflow-x-auto scroll-thin">
        <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${list.length}, ${cell}px)` }} role="img" aria-label="Attention matrix">
          {matrix.map((row, i) =>
            row.map((w, k) => (
              <motion.div
                key={`${i}-${k}`}
                onClick={() => setQ(i)}
                className="cursor-pointer rounded-[3px]"
                style={{ width: cell, height: cell }}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1, backgroundColor: k > i ? 'rgba(255,255,255,0.03)' : `rgba(${i === query ? '220,235,255' : '164,107,255'},${0.06 + w * 0.94})` }}
                transition={{ delay: (i + k) * 0.012 }}
                title={`${showToken(list[i])} → ${showToken(list[k])}: ${(w * 100).toFixed(0)}%`}
              />
            )),
          )}
        </div>
        <p className="mt-2 font-mono text-[9px] text-muted">rows = query token · columns = key token · grey triangle = masked future</p>
      </div>
    </div>
  )
}
