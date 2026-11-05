import { motion } from 'motion/react'
import { AudioLines, Brain, Check, FileText, Mic, Puzzle, Sparkles, Speaker, Type } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { STAGES, useAssistant } from '../../state/AssistantContext'
import { STAGE_LESSONS } from '../../lib/learn'
import { STAGE_VIEWS } from './stages'
import { Learn } from '../ui/primitives'

export const STAGE_ICONS = [Mic, AudioLines, FileText, Puzzle, Brain, Sparkles, Type, Speaker]

type StageState = 'pending' | 'active' | 'done' | 'skipped'
/** Typed questions never pass through voice input (0) or speech-to-text (1). */
export const stageState = (i: number, stage: number, typed = false): StageState =>
  typed && i < 2 && stage >= 2 ? 'skipped' : stage === i ? 'active' : stage > i ? 'done' : 'pending'

/** Horizontal stepper: VOICE → … → AUDIO, with a fill bar that follows the live stage. */
export function PipelineStepper({ onPick, compact = false }: { onPick?: (i: number) => void; compact?: boolean }) {
  const { stage, turn } = useAssistant()
  const typed = turn?.source === 'text'
  const progress = stage < 0 ? 0 : Math.min(stage, 7) / 7
  return (
    <div className="relative">
      <div className="absolute top-5 right-5 left-5 h-px bg-line/50" />
      <motion.div className="absolute top-5 left-5 h-px origin-left bg-gradient-to-r from-glow-blue via-glow-violet to-glow-pink" style={{ right: 20 }} animate={{ scaleX: progress }} transition={{ type: 'spring', bounce: 0, duration: 0.8 }} />
      <ol className="relative flex justify-between">
        {STAGES.map((name, i) => {
          const st = stageState(i, stage, typed)
          const Icon = STAGE_ICONS[i]
          return (
            <li key={name} className="flex w-10 flex-col items-center gap-1.5">
              <motion.button
                onClick={() => onPick?.(i)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className={`relative grid size-10 place-items-center rounded-full border ${st === 'skipped' ? 'border-dashed opacity-60' : ''}`}
                animate={{
                  borderColor: st === 'pending' || st === 'skipped' ? 'rgba(102,102,109,0.8)' : 'rgba(220,235,255,0.9)',
                  backgroundColor: st === 'active' ? 'rgba(220,235,255,0.95)' : st === 'done' ? 'rgba(74,74,80,1)' : 'rgba(36,37,42,1)',
                  color: st === 'active' ? '#18191d' : st === 'done' ? '#dcebff' : '#b8bbc2',
                }}
                aria-label={st === 'skipped' ? `${name} (skipped)` : name}
              >
                {st === 'done' ? <Check size={15} /> : <Icon size={15} />}
                {st === 'active' && (
                  <motion.span className="absolute inset-0 rounded-full border-2 border-accent" animate={{ scale: [1, 1.6], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} />
                )}
              </motion.button>
              {!compact && <span className={`hidden w-16 text-center text-[9px] leading-tight md:block ${st === 'pending' || st === 'skipped' ? 'text-muted' : 'text-white'}`}>{name}</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function PipelineStage({ index }: { index: number }) {
  const { stage, turn } = useAssistant()
  const st = stageState(index, stage, turn?.source === 'text')
  const View = STAGE_VIEWS[index]
  const lesson = STAGE_LESSONS[index]
  const Icon = STAGE_ICONS[index]
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (st === 'active') ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [st])

  return (
    <motion.section
      ref={ref}
      id={`stage-${index}`}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass relative flex flex-col gap-3 overflow-hidden rounded-[20px] p-4 scroll-mt-24"
      style={{ borderColor: st === 'active' ? 'rgba(220,235,255,0.7)' : undefined }}
    >
      {st === 'active' && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[20px]"
          animate={{ boxShadow: ['inset 0 0 0px rgba(91,140,255,0)', 'inset 0 0 40px rgba(91,140,255,0.25)', 'inset 0 0 0px rgba(91,140,255,0)'] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] text-accent">{String(index + 1).padStart(2, '0')}</span>
          <Icon size={15} className="text-accent" />
          <div>
            <h3 className="text-[13px] font-semibold">{lesson.title}</h3>
            <p className="text-[11px] text-muted">{lesson.summary}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-lg px-2 py-1 font-mono text-[9px] uppercase ${st === 'active' ? 'bg-accent text-bg' : st === 'done' ? 'bg-chip text-ok' : 'bg-chip text-muted'}`}>
          {st === 'active' ? 'live' : st}
        </span>
      </header>
      <View />
      <Learn>
        {lesson.body}
        <p>
          <b>Analogy:</b> {lesson.analogy}
        </p>
        <dl className="grid gap-1 pt-1">
          {lesson.terms.map(([t, d]) => (
            <div key={t} className="flex gap-2 text-[11px]">
              <dt className="shrink-0 font-mono text-accent">{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </Learn>
    </motion.section>
  )
}

export function ProcessingPipeline() {
  const pick = (i: number) => document.getElementById(`stage-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <div className="space-y-5">
      <div className="glass sticky top-2 z-10 rounded-[20px] bg-bg/85 px-4 py-4 sm:px-6">
        <PipelineStepper onPick={pick} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {STAGES.map((_, i) => (
          <PipelineStage key={i} index={i} />
        ))}
      </div>
    </div>
  )
}
