import { motion } from 'motion/react'
import { Check, Cpu, RefreshCw, Server, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useAssistant } from '../../state/AssistantContext'
import { speak, useVoices } from '../../hooks/useVoice'
import { Chip, Panel, SectionTitle, SourceBadge, Stat } from '../ui/primitives'

const gb = (b: number) => `${(b / 1e9).toFixed(1)} GB`

function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start justify-between gap-4 py-2 ${disabled ? 'opacity-40' : 'cursor-pointer'}`}>
      <span>
        <span className="block text-[13px]">{label}</span>
        <span className="block text-[11px] text-muted">{hint}</span>
      </span>
      <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-chip'}`}>
        <motion.span className="absolute top-0.5 size-5 rounded-full bg-bg" animate={{ left: on ? 22 : 2 }} transition={{ type: 'spring', bounce: 0.3, duration: 0.35 }} />
      </button>
    </label>
  )
}

export function ModelSettings() {
  const { settings, updateSettings, models, modelInfo, connection, connectionError, refreshModels } = useAssistant()
  const voices = useVoices()
  const [base, setBase] = useState(settings.base)
  const canThink = modelInfo?.capabilities.includes('thinking')

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel className="space-y-4 p-5">
        <SectionTitle icon={<Server size={16} className="text-accent" />} right={<Chip tone={connection === 'online' ? 'ok' : connection === 'checking' ? 'warn' : 'err'}>{connection}</Chip>}>
          Ollama connection
        </SectionTitle>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (base.trim() === settings.base) refreshModels()
            else updateSettings({ base: base.trim().replace(/\/$/, '') })
          }}
        >
          <input value={base} onChange={(e) => setBase(e.target.value)} className="flex-1 rounded-xl border border-line bg-bg/60 px-3 py-2 font-mono text-[13px] outline-none focus:border-accent" aria-label="Ollama endpoint" />
          <motion.button whileTap={{ scale: 0.92 }} className="flex items-center gap-1.5 rounded-xl bg-accent px-3 text-[12px] font-medium text-bg">
            <RefreshCw size={14} className={connection === 'checking' ? 'animate-spin' : ''} /> Connect
          </motion.button>
        </form>
        {connection === 'offline' && (
          <div className="space-y-2 rounded-xl border border-err/40 bg-err/10 p-3 text-[12px] text-err">
            <p>
              Could not reach Ollama at <span className="font-mono">{settings.base}</span> ({connectionError}).
            </p>
            {location.hostname === 'localhost' ? (
              <p>
                Make sure it is running: <span className="font-mono">ollama serve</span>
              </p>
            ) : (
              <>
                {/* Ollama rejects browser requests from origins it doesn't know, so hosted copies need this. */}
                <p>Allow this site to use the Ollama on your computer, then restart Ollama:</p>
                <code className="block rounded-lg bg-bg/70 p-2 font-mono text-[11px] break-all text-white select-all">OLLAMA_ORIGINS={location.origin} ollama serve</code>
                <p>
                  Menu-bar app on macOS: <code className="font-mono text-white select-all">launchctl setenv OLLAMA_ORIGINS {location.origin}</code>, then quit and reopen Ollama. If Chrome asks to access devices on your local network, choose Allow.
                </p>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-widest text-muted uppercase">Local models ({models.length})</p>
          {!models.length && connection === 'online' && <p className="text-[12px] text-muted">No models installed. Try <span className="font-mono">ollama pull llama3.2</span>.</p>}
          {models.map((m) => {
            const active = m.name === settings.model
            return (
              <motion.button
                key={m.name}
                layout
                whileHover={{ x: 2 }}
                onClick={() => updateSettings({ model: m.name })}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${active ? 'border-accent/70 bg-accent/10' : 'border-line/60 bg-bg/40'}`}
              >
                <span className="grid size-9 place-items-center rounded-lg bg-chip text-accent">
                  <Cpu size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[13px]">{m.name}</span>
                  <span className="block text-[11px] text-muted">
                    {[m.details.family, m.details.parameter_size, m.details.quantization_level, gb(m.size)].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {active && <Check size={16} className="text-accent" />}
              </motion.button>
            )
          })}
        </div>

        {modelInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-widest text-muted uppercase">Model details</p>
              <SourceBadge kind="real" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Layers" value={modelInfo.layers ?? '—'} />
              <Stat label="Embedding" value={modelInfo.embeddingLength?.toLocaleString() ?? '—'} />
              <Stat label="Heads" value={modelInfo.heads ?? '—'} />
              <Stat label="Context" value={modelInfo.contextLength?.toLocaleString() ?? '—'} />
              <Stat label="Tokenizer" value={modelInfo.vocabModel ?? '—'} />
              <Stat label="Arch" value={modelInfo.architecture ?? '—'} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {modelInfo.capabilities.map((c) => (
                <Chip key={c} tone="status">
                  {c}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <div className="space-y-5">
        <Panel className="space-y-3 p-5">
          <SectionTitle icon={<Volume2 size={16} className="text-accent" />}>Voice output</SectionTitle>
          <select value={settings.voiceURI} onChange={(e) => updateSettings({ voiceURI: e.target.value })} className="w-full rounded-xl border border-line bg-bg/60 px-3 py-2 text-[13px] outline-none focus:border-accent" aria-label="Voice">
            <option value="">System default voice</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang}){v.localService ? '' : ' · online'}
              </option>
            ))}
          </select>
          <label className="block">
            <span className="flex justify-between text-[12px] text-muted">
              Speaking rate <span className="font-mono text-white">{settings.rate.toFixed(1)}×</span>
            </span>
            <input type="range" min={0.6} max={1.6} step={0.1} value={settings.rate} onChange={(e) => updateSettings({ rate: +e.target.value })} className="mt-2 w-full accent-[#dcebff]" />
          </label>
          <button onClick={() => speak('Hi, I am Nova. This is how I will sound.', { voiceURI: settings.voiceURI, rate: settings.rate })} className="rounded-xl border border-line px-3 py-2 text-[12px] text-accent">
            Test voice
          </button>
        </Panel>

        <Panel className="divide-y divide-line/40 p-5">
          <Toggle on={settings.autoSpeak} onChange={(v) => updateSettings({ autoSpeak: v })} label="Speak answers automatically" hint="Read each reply aloud as soon as it finishes." />
          <Toggle on={settings.pacing} onChange={(v) => updateSettings({ pacing: v })} label="Educational pacing" hint="Pause briefly on text processing and tokenization so you can watch them. Off = real speed." />
          <Toggle
            on={settings.think && !!canThink}
            disabled={!canThink}
            onChange={(v) => updateSettings({ think: v })}
            label="Show model reasoning"
            hint={canThink ? 'Let thinking models reason first; the reasoning appears in the neural network stage. Slower.' : 'This model does not support thinking.'}
          />
        </Panel>
      </div>
    </div>
  )
}
