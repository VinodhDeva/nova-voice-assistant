import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useAssistant } from '../../state/AssistantContext'
import { PipelineStepper } from '../pipeline/ProcessingPipeline'
import { ParticleVoice } from '../ui/ParticleVoice'
import { AssistantHeader, Composer, HistoryDrawer, RequestTrace, ResponseCard, StatusPill, Suggestions, TranscriptCard } from './parts'
import type { Tab } from '../layout/AppShell'

const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.2, duration: 0.6 } } }

export function AssistantDashboard({ go }: { go: (t: Tab) => void }) {
  const { status } = useAssistant()
  const [history, setHistory] = useState(false)

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-4">
        <motion.div variants={rise}>
          <AssistantHeader onHistory={() => setHistory(true)} onSettings={() => go('settings')} />
        </motion.div>
        <motion.div variants={rise}>
          <TranscriptCard />
        </motion.div>
        {/* On mobile the trace sits between request and answer, as in the Figma frame. */}
        <motion.div variants={rise} className="lg:hidden">
          <RequestTrace onOpenPipeline={() => go('pipeline')} />
        </motion.div>
        <motion.div variants={rise}>
          <ParticleVoice className="h-[240px] lg:h-[360px]" />
        </motion.div>
        <motion.div variants={rise} className="pt-1">
          <ResponseCard />
        </motion.div>
        <motion.div variants={rise}>
          <Suggestions />
        </motion.div>
        <motion.div variants={rise} className="sticky bottom-[84px] z-10 bg-gradient-to-t from-bg via-bg/95 to-transparent pt-6 pb-2 lg:static lg:bg-none lg:pt-0">
          <Composer onVoiceSettings={() => go('settings')} />
        </motion.div>
      </div>
      <div className="hidden min-w-0 flex-col gap-5 lg:flex">
        <motion.div variants={rise} className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">Live AI pipeline</span>
          <StatusPill status={status} />
        </motion.div>
        <motion.div variants={rise} className="glass rounded-[20px] px-5 py-4">
          <PipelineStepper compact onPick={() => go('pipeline')} />
        </motion.div>
        <motion.div variants={rise}>
          <RequestTrace onOpenPipeline={() => go('pipeline')} />
        </motion.div>
        <motion.button variants={rise} whileHover={{ x: 4 }} onClick={() => go('pipeline')} className="flex items-center gap-2 self-start text-[12px] text-accent">
          Explore every stage in detail <ArrowRight size={14} />
        </motion.button>
      </div>
      <HistoryDrawer open={history} onClose={() => setHistory(false)} />
    </motion.div>
  )
}
