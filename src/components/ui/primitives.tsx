import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, FlaskConical, Radio } from 'lucide-react'
import { useState, type ReactNode } from 'react'

export function Panel({ className = '', children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`glass rounded-[20px] ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function Chip({ children, tone = 'accent', className = '' }: { children: ReactNode; tone?: 'accent' | 'status' | 'ok' | 'warn' | 'err'; className?: string }) {
  const tones = {
    accent: 'bg-chip text-accent',
    status: 'bg-chip text-chip-fg',
    ok: 'bg-ok/15 text-ok',
    warn: 'bg-warn/15 text-warn',
    err: 'bg-err/15 text-err',
  }
  return <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[10px] font-medium whitespace-nowrap ${tones[tone]} ${className}`}>{children}</span>
}

/** Marks a visual as real Ollama data or an educational simulation. */
export function SourceBadge({ kind }: { kind: 'real' | 'sim' }) {
  return kind === 'real' ? (
    <span title="Measured from your local Ollama model" className="inline-flex items-center gap-1 rounded-full border border-ok/40 bg-ok/10 px-2 py-0.5 font-mono text-[9px] tracking-wide text-ok uppercase">
      <Radio size={10} /> Live telemetry
    </span>
  ) : (
    <span title="Conceptual illustration — Ollama does not expose these internals" className="inline-flex items-center gap-1 rounded-full border border-glow-violet/40 bg-glow-violet/10 px-2 py-0.5 font-mono text-[9px] tracking-wide text-[#d3b8ff] uppercase">
      <FlaskConical size={10} /> Simulation
    </span>
  )
}

export function Learn({ title = 'How it works', children, defaultOpen = false }: { title?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-line/50 bg-bg/40">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-medium text-accent">
        {title}
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown size={14} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.35 }} style={{ overflow: 'hidden' }}>
            <div className="space-y-2 px-3 pb-3 text-[12px] leading-relaxed text-muted [&_b]:text-white [&_em]:text-accent [&_em]:not-italic">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function SectionTitle({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
        {icon}
        {children}
      </h2>
      {right}
    </div>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl bg-bg/50 px-3 py-2">
      <div className="font-mono text-[9px] tracking-wider text-muted uppercase">{label}</div>
      <div className="mt-0.5 font-mono text-[13px] text-white">{value}</div>
      {sub && <div className="font-mono text-[9px] text-muted">{sub}</div>}
    </div>
  )
}
