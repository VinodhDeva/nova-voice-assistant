import { AnimatePresence, motion } from 'motion/react'
import { Brain, GraduationCap, MessageCircle, Mic, Settings2, Square, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAssistant } from '../../state/AssistantContext'
import { Orb } from '../ui/Orb'
import { StatusPill } from '../assistant/parts'

export type Tab = 'assistant' | 'pipeline' | 'neural' | 'learn' | 'settings'

export const TABS: { id: Tab; label: string; short: string; icon: typeof Brain; blurb: string }[] = [
  { id: 'assistant', label: 'Assistant', short: 'Assistant', icon: MessageCircle, blurb: '' },
  { id: 'pipeline', label: 'AI Processing', short: 'Pipeline', icon: Workflow, blurb: 'Follow your request through all eight stages, live.' },
  { id: 'neural', label: 'Neural Network Explorer', short: 'Neural', icon: Brain, blurb: 'Step inside the transformer: embeddings, attention, prediction.' },
  { id: 'learn', label: 'Learning Center', short: 'Learn', icon: GraduationCap, blurb: 'How does an LLM think? Explore each idea at your own pace.' },
  { id: 'settings', label: 'Model Settings', short: 'Settings', icon: Settings2, blurb: 'Connect Ollama, pick a model and a voice.' },
]

export function AppShell({ tab, go, children }: { tab: Tab; go: (t: Tab) => void; children: ReactNode }) {
  const { status, connection } = useAssistant()
  const current = TABS.find((t) => t.id === tab)!
  return (
    <div className="aurora min-h-dvh overflow-x-clip">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 border-r border-line/40 bg-bg/60 p-5 backdrop-blur-xl lg:flex">
        <button onClick={() => go('assistant')} className="flex items-center gap-3">
          <Orb status={status} size={36} />
          <span className="text-left">
            <span className="block text-[20px] leading-none font-semibold tracking-[-0.6px]">nova</span>
            <span className="text-[10px] text-muted">Voice AI learning assistant</span>
          </span>
        </button>
        <nav className="flex flex-col gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => go(t.id)} className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors ${tab === t.id ? 'text-white' : 'text-muted hover:text-white'}`}>
              {tab === t.id && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl border border-line/70 bg-panel" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
              <t.icon size={17} className="relative" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3 rounded-2xl border border-line/50 bg-panel/50 p-3">
          <StatusPill status={status} />
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className={`size-1.5 rounded-full ${connection === 'online' ? 'bg-ok' : connection === 'checking' ? 'bg-warn' : 'bg-err'}`} />
            Ollama {connection}
          </p>
        </div>
      </aside>

      <div className="lg:pl-60">
      <main className="mx-auto max-w-[1180px] px-4 pt-5 pb-28 sm:px-5 lg:px-10 lg:pt-8 lg:pb-10">
        {tab !== 'assistant' && (
          <motion.header key={tab} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.8px] sm:text-[30px]">
                <span className="text-gradient">{current.label}</span>
              </h1>
              <p className="mt-1 text-[13px] text-muted">{current.blurb}</p>
            </div>
            <span className="lg:hidden">
              <StatusPill status={status} />
            </span>
          </motion.header>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>

      {tab !== 'assistant' && <MicDock />}

      {/* Mobile bottom nav */}
      <nav className="glass fixed inset-x-3 bottom-3 z-30 flex justify-between rounded-[22px] px-2 py-1.5 lg:hidden">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => go(t.id)} className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] ${tab === t.id ? 'text-white' : 'text-muted'}`}>
            {tab === t.id && <motion.span layoutId="mnav-active" className="absolute inset-0 rounded-2xl bg-panel" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
            <t.icon size={18} className="relative" />
            <span className="relative">{t.short}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

/** Floating mic so you can ask a question while watching the pipeline or network. */
function MicDock() {
  const { status, startListening, stopListening, cancel } = useAssistant()
  const listening = status === 'listening' || status === 'recording' || status === 'transcribing'
  const busy = ['processing', 'tokenizing', 'thinking', 'generating', 'speaking'].includes(status)
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => (listening ? stopListening() : busy ? cancel() : startListening())}
      aria-label={listening ? 'Stop listening' : busy ? 'Stop' : 'Ask by voice'}
      className="fixed right-5 bottom-24 z-30 grid size-16 place-items-center rounded-full border border-line bg-panel shadow-[0_8px_30px_rgba(0,0,0,0.5)] lg:right-8 lg:bottom-8"
    >
      <Orb status={status} size={52} rings />
      <span className="absolute inset-0 grid place-items-center text-white drop-shadow">{listening || busy ? <Square size={18} fill="white" /> : <Mic size={22} />}</span>
    </motion.button>
  )
}
