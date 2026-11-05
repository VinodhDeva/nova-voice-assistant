import { AnimatePresence, motion, stagger } from 'motion/react'
import { CheckCircle2, Mic, MicOff, Pause, Play, Square, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAssistant } from '../../state/AssistantContext'
import { mostUncertain, ns } from '../../lib/ollama'
import { showToken } from '../../lib/text'
import { AudioWaveform } from '../ui/AudioWaveform'
import { ParticleVoice } from '../ui/ParticleVoice'
import { Chip, SourceBadge, Stat } from '../ui/primitives'
import { NeuralNetworkVisualizer } from '../neural/NeuralNetworkVisualizer'
import { NextTokenBars } from '../neural/NextTokenBars'

export function useElapsed(running: boolean, from?: number) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(id)
  }, [running])
  return from ? Math.max(0, now - from) : 0
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="font-mono text-[10px] text-muted">{children}</p>

// 1 ─ Voice input
export function VoiceInputStage() {
  const { status, turn, micAnalyser, sampleRate } = useAssistant()
  const live = status === 'listening' || status === 'recording' || status === 'transcribing'
  const elapsed = useElapsed(live, turn?.source === 'voice' ? turn.startedAt : undefined)
  const ms = live ? elapsed : turn?.recordMs ?? 0
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12px]">
          <motion.span animate={live ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ repeat: Infinity, duration: 1 }} className={`grid size-6 place-items-center rounded-full ${live ? 'bg-err/20 text-err' : 'bg-chip text-muted'}`}>
            {live ? <Mic size={12} /> : <MicOff size={12} />}
          </motion.span>
          {live ? (status === 'listening' ? 'Microphone open — listening' : 'Voice detected — recording') : 'Microphone off'}
        </span>
        <span className="font-mono text-[11px] text-accent">{(ms / 1000).toFixed(1)}s</span>
      </div>
      <AudioWaveform analyser={micAnalyser} active={live} height={52} />
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Sample rate" value={sampleRate ? `${(sampleRate / 1000).toFixed(1)} kHz` : '—'} />
        <Stat label="Samples" value={sampleRate && ms ? Math.round((sampleRate * ms) / 1000).toLocaleString() : '—'} />
        <Stat label="Input" value={turn?.source === 'text' ? 'Keyboard' : 'Mic'} />
      </div>
    </div>
  )
}

// 2 ─ Speech-to-text
export function SpeechToTextStage() {
  const { status, turn, micAnalyser } = useAssistant()
  const live = status === 'recording' || status === 'transcribing' || status === 'listening'
  const text = turn?.source === 'voice' ? turn.interim || turn.raw : ''
  return (
    <div className="space-y-3">
      <AudioWaveform analyser={micAnalyser} active={live} bars={32} height={28} colors={['#7e8cff', '#dcebff']} />
      <div className="min-h-12 rounded-xl bg-bg/50 p-3 text-[14px] leading-snug">
        {text ? (
          <span>
            {text}
            {live && <motion.span className="ml-0.5 inline-block h-4 w-0.5 bg-accent align-middle" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />}
          </span>
        ) : (
          <Empty>{turn?.source === 'text' ? 'Typed input — speech recognition skipped.' : 'Speak to see live transcription…'}</Empty>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip tone="status">{live ? 'interim results streaming' : turn?.raw ? 'final transcript' : 'idle'}</Chip>
        {turn?.confidence ? <Chip>confidence {Math.round(turn.confidence * 100)}%</Chip> : null}
        <Chip tone="status">en-US</Chip>
      </div>
    </div>
  )
}

// 3 ─ Text processing
export function TextProcessingStage() {
  const { turn, messages } = useAssistant()
  const n = turn?.normalized
  if (!n) return <Empty>Waiting for a transcript…</Empty>
  return (
    <div className="space-y-3">
      <motion.ol className="space-y-1.5" initial="hidden" animate="show" variants={{ show: { transition: { delayChildren: stagger(0.12) } } }}>
        {n.steps.map((s) => (
          <motion.li key={s.label} variants={{ hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0 } }} className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 size={12} className={s.before === s.after ? 'text-muted' : 'text-ok'} />
            <span className="text-muted">{s.label}</span>
            {s.before !== s.after && <span className="font-mono text-[9px] text-ok">changed</span>}
          </motion.li>
        ))}
      </motion.ol>
      <div className="rounded-xl bg-bg/60 p-3 font-mono text-[10px] leading-relaxed text-muted">
        <div><span className="text-glow-violet">system</span>: You are Nova, a friendly voice assistant…</div>
        {messages.length > 1 && <div><span className="text-glow-violet">history</span>: {Math.min(messages.length - 1, 10)} earlier messages</div>}
        <div><span className="text-glow-violet">user</span>: <span className="text-white">{n.text}</span></div>
      </div>
    </div>
  )
}

// 4 ─ Tokenization
export function TokenizationStage({ compact = false }: { compact?: boolean }) {
  const { turn } = useAssistant()
  const tokens = turn?.tokens ?? []
  if (!tokens.length) return <Empty>No tokens yet.</Empty>
  const real = turn?.telemetry?.prompt_eval_count
  return (
    <div className="space-y-3">
      {!compact && <p className="text-[13px] text-white">{turn?.normalized?.text}</p>}
      <motion.div className="flex flex-wrap gap-1.5" initial="hidden" animate="show" variants={{ show: { transition: { delayChildren: stagger(0.05) } } }}>
        {tokens.slice(0, compact ? 6 : 60).map((t, i) => (
          <motion.div
            key={i + t.text}
            variants={{ hidden: { opacity: 0, y: 10, scale: 0.8 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', bounce: 0.4 } } }}
            className="flex flex-col items-center rounded-[5px] bg-panel px-2 py-1.5"
            style={{ boxShadow: `inset 0 -2px 0 hsl(${(t.id * 47) % 360} 70% 70% / 0.6)` }}
          >
            <span className="font-mono text-[10px] text-accent whitespace-pre">{showToken(t.text)}</span>
            {!compact && <span className="font-mono text-[8px] text-muted">#{t.id}</span>}
          </motion.div>
        ))}
        {compact && tokens.length > 6 && <span className="rounded-[5px] bg-panel px-2 py-1.5 font-mono text-[10px] text-accent">…</span>}
      </motion.div>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="status">≈ {tokens.length} tokens (approx.)</Chip>
          {real ? <Chip tone="ok">{real} prompt tokens incl. template · real</Chip> : <Chip tone="status">real count arrives after reply</Chip>}
          <span className="font-mono text-[9px] text-muted">IDs illustrative</span>
        </div>
      )}
    </div>
  )
}

// 5 ─ Neural network
export function NeuralStage() {
  const { stage, modelInfo, settings, turn } = useAssistant()
  const active = stage === 4 || stage === 5
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="w-1/2 shrink-0">
          <NeuralNetworkVisualizer active={active} />
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="truncate font-mono text-[11px] text-white">{settings.model || 'no model'}</p>
          <p className="text-[10px] leading-snug text-muted">Attention connects your words and context.</p>
          <p className="font-mono text-[10px] text-accent">
            {modelInfo?.layers ?? '?'} layers · {modelInfo?.embeddingLength?.toLocaleString() ?? '?'} dims
          </p>
          {turn?.telemetry && <p className="font-mono text-[10px] text-ok">prompt read in {ns(turn.telemetry.prompt_eval_duration).toFixed(0)} ms</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <SourceBadge kind="sim" />
        <span className="font-mono text-[9px] text-muted">diagram simulated · architecture numbers are real</span>
      </div>
      <AnimatePresence>
        {turn?.thinking && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="max-h-24 overflow-y-auto rounded-xl bg-bg/60 p-2 font-mono text-[10px] text-muted scroll-thin">
            <span className="text-glow-violet">reasoning · </span>
            {turn.thinking.slice(-600)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// 6 ─ Response generation
export function GenerationStage() {
  const { stage, turn } = useAssistant()
  const toks = turn?.outTokens ?? []
  const t = turn?.telemetry
  const tps = t?.eval_count && t.eval_duration ? t.eval_count / (t.eval_duration / 1e9) : undefined
  if (!toks.length) return <Empty>{stage === 4 ? 'Model is reading the prompt…' : 'No tokens generated yet.'}</Empty>
  const shown = stage === 5 ? toks.at(-1)! : mostUncertain(toks) ?? toks.at(-1)!
  return (
    <div className="space-y-3">
      <div className="flex max-h-28 flex-wrap gap-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {toks.slice(-36).map((tk, i) => (
            <motion.span key={toks.length - 36 + i} layout initial={{ opacity: 0, scale: 0.6, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="rounded bg-panel px-1.5 py-0.5 font-mono text-[10px] text-accent whitespace-pre" style={{ opacity: tk.logprob !== undefined ? 0.45 + Math.exp(tk.logprob) * 0.55 : 1 }}>
              {showToken(tk.token)}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div>
        <div className="mb-1 flex justify-between font-mono text-[9px] text-muted">
          <span>{stage === 5 ? 'Candidates for the newest token' : 'Least certain choice in this reply'} · chose “{showToken(shown.token)}”</span>
          <SourceBadge kind="real" />
        </div>
        <NextTokenBars token={shown} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Tokens" value={toks.length} />
        <Stat label="First token" value={turn?.firstTokenMs ? `${Math.round(turn.firstTokenMs)} ms` : '—'} />
        <Stat label="Speed" value={tps ? `${tps.toFixed(1)} t/s` : stage === 5 ? 'streaming' : '—'} />
      </div>
    </div>
  )
}

// 7 ─ Text-to-speech
export function TextToSpeechStage() {
  const { stage, turn, settings } = useAssistant()
  const text = turn?.response.trim() ?? ''
  const spoken = Math.min(turn?.spokenChars ?? 0, text.length)
  if (!text || stage < 6) return <Empty>{settings.autoSpeak ? 'Speech starts once the reply is complete.' : 'Auto-speak is off — use Play response.'}</Empty>
  return (
    <div className="space-y-3">
      <p className="max-h-24 overflow-y-auto text-[12px] leading-relaxed scroll-thin">
        <span className="text-white">{text.slice(0, spoken)}</span>
        <span className="text-muted/60">{text.slice(spoken)}</span>
      </p>
      <ParticleVoice height={140} />
      <div className="h-1 overflow-hidden rounded-full bg-bg/70">
        <motion.div className="h-full bg-gradient-to-r from-glow-violet to-glow-pink" animate={{ width: `${(spoken / text.length) * 100}%` }} />
      </div>
    </div>
  )
}

// 8 ─ Audio output
export function AudioOutputStage() {
  const { stage, speakingId, paused, togglePause, stopSpeaking, speakMessage, messages } = useAssistant()
  const last = [...messages].reverse().find((m) => m.role === 'assistant')
  const playing = speakingId !== null
  return (
    <div className="flex items-center gap-3">
      <motion.button
        whileTap={{ scale: 0.9 }}
        disabled={!last}
        onClick={() => (playing ? togglePause() : last && speakMessage(last.id))}
        className="grid size-11 place-items-center rounded-full border border-line bg-panel text-accent disabled:opacity-40"
        aria-label={playing && !paused ? 'Pause' : 'Play'}
      >
        {playing && !paused ? <Pause size={18} /> : <Play size={18} />}
      </motion.button>
      {playing && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={stopSpeaking} className="grid size-9 place-items-center rounded-full border border-line bg-panel text-muted" aria-label="Stop">
          <Square size={14} />
        </motion.button>
      )}
      <div className="flex flex-1 items-end gap-1" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <motion.span key={i} className="w-1.5 rounded-full bg-accent" animate={playing && !paused ? { height: [6, 22, 8, 16, 6] } : { height: 6 }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.12 }} />
        ))}
        <Volume2 size={16} className="ml-2 text-muted" />
      </div>
      <Chip tone={stage === 8 ? 'ok' : playing ? 'accent' : 'status'}>{stage === 8 ? 'complete' : playing ? (paused ? 'paused' : 'speaking') : 'ready'}</Chip>
    </div>
  )
}

export const STAGE_VIEWS = [VoiceInputStage, SpeechToTextStage, TextProcessingStage, TokenizationStage, NeuralStage, GenerationStage, TextToSpeechStage, AudioOutputStage]
