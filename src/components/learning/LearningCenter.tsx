import { AnimatePresence, motion } from 'motion/react'
import { Lightbulb, MessageCircleQuestion, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { CORE_CONCEPTS, STAGE_LESSONS } from '../../lib/learn'
import { approxTokenize, showToken } from '../../lib/text'
import { useAssistant } from '../../state/AssistantContext'
import { STAGE_ICONS } from '../pipeline/ProcessingPipeline'
import { AttentionVisualizer } from '../neural/AttentionVisualizer'
import { NeuralNetworkVisualizer } from '../neural/NeuralNetworkVisualizer'
import { Learn, Panel } from '../ui/primitives'

const QUESTION = 'What is artificial intelligence?'
const TOKS = approxTokenize(QUESTION)
const ANSWER = ['Artificial', ' intelligence', ' is', ' the', ' ability', ' of', ' machines', ' to', ' learn', ' and', ' reason', '.']

const THINK_STEPS = [
  {
    title: 'Input text',
    text: 'You ask a question. To the model it is just a string of characters.',
    visual: () => <p className="text-[22px] font-medium">“{QUESTION}”</p>,
  },
  {
    title: 'Tokenization',
    text: 'The text is cut into tokens and each becomes a number.',
    visual: () => (
      <div className="flex flex-wrap gap-2">
        {TOKS.map((t, i) => (
          <motion.span key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-lg bg-panel px-2.5 py-1.5 font-mono text-[12px] text-accent">
            {showToken(t.text)} <span className="text-muted">#{t.id}</span>
          </motion.span>
        ))}
      </div>
    ),
  },
  {
    title: 'Embeddings',
    text: 'Every token becomes a vector — a point in “meaning space”. Related words sit close together.',
    visual: () => (
      <svg viewBox="0 0 320 160" className="w-full max-w-md">
        {[
          ['artificial', 60, 50],
          ['intelligence', 110, 70],
          ['machine', 85, 110],
          ['brain', 150, 40],
          ['banana', 270, 130],
          ['fruit', 240, 110],
        ].map(([w, x, y], i) => (
          <motion.g key={w as string} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.12, type: 'spring' }}>
            <circle cx={x as number} cy={y as number} r={5} fill={i < 4 ? '#5b8cff' : '#ff6bd5'} />
            <text x={(x as number) + 8} y={(y as number) + 4} fontSize={11} className="fill-muted font-mono">
              {w}
            </text>
          </motion.g>
        ))}
      </svg>
    ),
  },
  {
    title: 'Transformer processing',
    text: 'The vectors pass through many identical layers. Each layer refines what every token means in context.',
    visual: () => <NeuralNetworkVisualizer layers={[4, 6, 6, 6, 4]} width={420} height={170} active />,
  },
  {
    title: 'Attention',
    text: '“intelligence” looks back at “artificial” — together they mean AI, not human smarts.',
    visual: () => <AttentionVisualizer tokens={TOKS.map((t) => t.text)} compact />,
  },
  {
    title: 'Next-token prediction',
    text: 'The model scores every possible next token. “Artificial” wins with the highest probability.',
    visual: () => (
      <div className="space-y-2">
        {[
          ['Artificial', 62],
          ['AI', 21],
          ['It', 8],
          ['Great', 5],
        ].map(([t, p], i) => (
          <div key={t} className="flex items-center gap-2">
            <span className="w-20 font-mono text-[12px]">{t}</span>
            <div className="h-2.5 flex-1 rounded-full bg-bg/70">
              <motion.div className={`h-full rounded-full ${i ? 'bg-chip' : 'bg-gradient-to-r from-glow-blue to-glow-pink'}`} initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ delay: i * 0.1, type: 'spring', bounce: 0.2 }} />
            </div>
            <span className="w-10 text-right font-mono text-[11px] text-muted">{p}%</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Response generation',
    text: 'Pick a token, append it, repeat. Word by word, the answer appears.',
    visual: () => (
      <p className="text-[18px] leading-relaxed">
        {ANSWER.map((w, i) => (
          <motion.span key={i} initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ delay: i * 0.18 }}>
            {w}
          </motion.span>
        ))}
      </p>
    ),
  },
]

export function LearningCenter({ onAsk }: { onAsk: () => void }) {
  const [step, setStep] = useState(0)
  const { send } = useAssistant()
  const S = THINK_STEPS[step]

  return (
    <div className="space-y-8">
      <Panel className="overflow-hidden p-0">
        <div className="border-b border-line/50 p-5">
          <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-accent uppercase">
            <Sparkles size={12} /> Interactive walkthrough
          </p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.5px]">How Does an LLM Think?</h2>
          <p className="text-[13px] text-muted">Click each stage to see what happens inside the model for one simple question.</p>
        </div>
        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
          <ol className="flex gap-1 overflow-x-auto border-line/50 p-3 scroll-thin lg:flex-col lg:border-r">
            {THINK_STEPS.map((s, i) => (
              <li key={s.title}>
                <button onClick={() => setStep(i)} className="relative flex w-full min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left">
                  {step === i && <motion.span layoutId="think-step" className="absolute inset-0 rounded-xl bg-panel" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
                  <span className={`relative grid size-6 place-items-center rounded-full font-mono text-[10px] ${i <= step ? 'bg-accent text-bg' : 'bg-chip text-muted'}`}>{i + 1}</span>
                  <span className={`relative text-[13px] ${step === i ? 'text-white' : 'text-muted'}`}>{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="min-h-[300px] p-5 sm:p-7">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }} className="space-y-5">
                <div>
                  <p className="font-mono text-[10px] text-muted">STEP {step + 1} / {THINK_STEPS.length}</p>
                  <h3 className="text-[18px] font-semibold">{S.title}</h3>
                  <p className="mt-1 text-[14px] text-muted">{S.text}</p>
                </div>
                <div className="rounded-2xl bg-bg/50 p-4">
                  <S.visual />
                </div>
                <div className="flex items-center justify-between">
                  <button disabled={step === 0} onClick={() => setStep(step - 1)} className="text-[12px] text-muted disabled:opacity-30">
                    ← Back
                  </button>
                  {step < THINK_STEPS.length - 1 ? (
                    <button onClick={() => setStep(step + 1)} className="rounded-full bg-accent px-4 py-2 text-[12px] font-medium text-bg">
                      Next: {THINK_STEPS[step + 1].title} →
                    </button>
                  ) : (
                    <button onClick={() => {
                        send(QUESTION)
                        onAsk()
                      }} className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[12px] font-medium text-bg">
                      <MessageCircleQuestion size={14} /> Ask your model for real
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Panel>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold">
          <Lightbulb size={16} className="text-warn" /> Core ideas
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {CORE_CONCEPTS.map((c, i) => (
            <motion.div key={c.q} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 2) * 0.06 }}>
              <Panel className="p-4">
                <p className="mb-2 text-[14px] font-medium">{c.q}</p>
                <Learn title="Explain it simply">
                  {c.a}
                  <p>
                    <b>Analogy:</b> {c.analogy}
                  </p>
                </Learn>
              </Panel>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[16px] font-semibold">The voice pipeline, stage by stage</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STAGE_LESSONS.map((l, i) => {
            const Icon = STAGE_ICONS[i]
            return (
              <motion.div key={l.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.05 }} whileHover={{ y: -3 }}>
                <Panel className="h-full space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-chip text-accent">
                      <Icon size={15} />
                    </span>
                    <span className="font-mono text-[10px] text-muted">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <p className="text-[14px] font-medium">{l.title}</p>
                  <p className="text-[12px] text-muted">{l.summary}</p>
                  <Learn title="Learn more">
                    {l.body}
                    <p>
                      <b>Analogy:</b> {l.analogy}
                    </p>
                    {l.terms.map(([t, d]) => (
                      <p key={t} className="text-[11px]">
                        <span className="font-mono text-accent">{t}</span> — {d}
                      </p>
                    ))}
                  </Learn>
                </Panel>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
