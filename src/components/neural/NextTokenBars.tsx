import { AnimatePresence, motion } from 'motion/react'
import type { StreamToken } from '../../lib/ollama'
import { showToken } from '../../lib/text'

/** Real next-token candidates from Ollama's `top_logprobs`. */
export function NextTokenBars({ token, max = 5 }: { token?: StreamToken; max?: number }) {
  if (!token?.top?.length) {
    return <p className="font-mono text-[10px] text-muted">Waiting for the model to predict a token…</p>
  }
  const rows = token.top.slice(0, max).map((t) => ({ ...t, p: Math.exp(t.logprob) }))
  return (
    <div className="space-y-1.5">
      <AnimatePresence initial={false} mode="popLayout">
        {rows.map((r) => {
          const chosen = r.token === token.token
          return (
            <motion.div key={r.token} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <span className={`w-20 truncate font-mono text-[11px] ${chosen ? 'text-white' : 'text-muted'}`}>{showToken(r.token)}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg/70">
                <motion.div
                  className={`h-full rounded-full ${chosen ? 'bg-gradient-to-r from-glow-blue to-glow-pink' : 'bg-chip'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, r.p * 100)}%` }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              </div>
              <span className="w-10 text-right font-mono text-[10px] text-muted">{(r.p * 100).toFixed(r.p < 0.1 ? 1 : 0)}%</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
