import { MotionConfig } from 'motion/react'
import { useState } from 'react'
import { AssistantProvider } from './state/AssistantContext'
import { AppShell, type Tab } from './components/layout/AppShell'
import { AssistantDashboard } from './components/assistant/AssistantDashboard'
import { ProcessingPipeline } from './components/pipeline/ProcessingPipeline'
import { NeuralNetworkExplorer } from './components/neural/NeuralNetworkExplorer'
import { LearningCenter } from './components/learning/LearningCenter'
import { ModelSettings } from './components/settings/ModelSettings'

export default function App() {
  const [tab, setTab] = useState<Tab>('assistant')
  const go = (t: Tab) => {
    setTab(t)
    window.scrollTo({ top: 0 })
  }
  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}>
      <AssistantProvider>
        <AppShell tab={tab} go={go}>
          {tab === 'assistant' && <AssistantDashboard go={go} />}
          {tab === 'pipeline' && <ProcessingPipeline />}
          {tab === 'neural' && <NeuralNetworkExplorer />}
          {tab === 'learn' && <LearningCenter onAsk={() => go('assistant')} />}
          {tab === 'settings' && <ModelSettings />}
        </AppShell>
      </AssistantProvider>
    </MotionConfig>
  )
}
