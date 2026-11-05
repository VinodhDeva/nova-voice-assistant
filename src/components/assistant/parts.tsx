import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, AudioLines, Check, CircleCheck, Cpu, History, Keyboard, Mic, Pause, Pencil, Play, Send, ShieldCheck, SlidersHorizontal, Square, Trash2, Workflow, X } from 'lucide-react'
import { useState } from 'react'
import { useAssistant, type Status } from '../../state/AssistantContext'
import { ns } from '../../lib/ollama'
import { speechRecognitionSupported } from '../../hooks/useVoice'
import { Orb } from '../ui/Orb'
import { Chip } from '../ui/primitives'
import { NeuralNetworkVisualizer } from '../neural/NeuralNetworkVisualizer'
import { TokenizationStage } from '../pipeline/stages'

export const STATUS_LABEL: Record<Status, string> = {
  idle: 'Idle',
  listening: 'Listening',
  recording: 'Recording',
  transcribing: 'Transcribing',
  processing: 'Processing text',
  tokenizing: 'Tokenizing',
  thinking: 'Thinking',
  generating: 'Generating response',
  speaking: 'Speaking',
  completed: 'Completed',
  error: 'Error',
}

const HINT: Record<Status, string> = {
  idle: "Tap to speak · I'm ready when you are",
  listening: "Listening… go ahead, I'm all ears",
  recording: 'Hearing you — tap to finish',
  transcribing: 'Turning your voice into text…',
  processing: 'Preparing your words for the model…',
  tokenizing: 'Splitting text into tokens…',
  thinking: 'The neural network is reading your request…',
  generating: 'Writing the answer one token at a time…',
  speaking: 'Speaking the answer — tap the mic to interrupt',
  completed: 'Tap to ask another question',
  error: 'Something went wrong — tap to try again',
}

export function StatusPill({ status }: { status: Status }) {
  const tone = status === 'error' ? 'text-err' : status === 'completed' ? 'text-ok' : status === 'idle' ? 'text-muted' : 'text-chip-fg'
  const busy = !['idle', 'completed', 'error'].includes(status)
  return (
    <span className={`inline-flex items-center gap-1.5 overflow-hidden rounded-lg bg-chip px-2 py-1 font-mono text-[10px] font-medium uppercase ${tone}`}>
      <motion.span className="size-1.5 rounded-full bg-current" animate={busy ? { opacity: [1, 0.2, 1] } : { opacity: 1 }} transition={{ repeat: Infinity, duration: 1 }} />
      <motion.span key={status} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {STATUS_LABEL[status]}
      </motion.span>
    </span>
  )
}

export function AssistantHeader({ onHistory, onSettings }: { onHistory: () => void; onSettings: () => void }) {
  const { status, connection, settings } = useAssistant()
  const dot = connection === 'online' ? 'bg-ok' : connection === 'checking' ? 'bg-warn' : 'bg-err'
  return (
    <div className="flex h-11 items-center gap-3">
      <div className="grid size-[42px] place-items-center rounded-[14px] border border-line bg-panel">
        <Orb status={status} size={34} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[23px] leading-none font-semibold tracking-[-0.7px]">nova</p>
        <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-muted">
          <motion.span className={`size-[5px] shrink-0 rounded-full ${dot}`} animate={connection === 'checking' ? { opacity: [1, 0.3, 1] } : {}} transition={{ repeat: Infinity, duration: 1 }} />
          {connection === 'online' ? `Ollama · ${settings.model || 'no model'}` : connection === 'checking' ? 'Connecting to Ollama…' : 'Ollama offline'}
        </p>
      </div>
      <IconButton label="Conversation history" onClick={onHistory}>
        <History size={20} />
      </IconButton>
      <IconButton label="Model settings" onClick={onSettings}>
        <SlidersHorizontal size={20} />
      </IconButton>
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.92 }} onClick={onClick} aria-label={label} title={label} className="grid size-10 place-items-center rounded-xl border border-line bg-panel text-accent">
      {children}
    </motion.button>
  )
}

export function TranscriptCard() {
  const { turn, status, send } = useAssistant()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const text = turn?.interim || turn?.raw || ''
  const live = status === 'listening' || status === 'recording' || status === 'transcribing'
  const time = turn ? new Date(Date.now() - (performance.now() - turn.startedAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <motion.div layout className="glass rounded-[20px] p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          {turn?.source === 'text' ? <Keyboard size={14} /> : <Mic size={14} />}
          {turn?.source === 'text' ? 'YOU TYPED' : 'YOU SAID'}
        </span>
        <span className="font-mono text-[10px] text-muted">
          {time}
          {turn?.recordMs ? ` · ${Math.round(turn.recordMs / 1000)}s` : ''}
        </span>
      </div>
      {editing ? (
        <form
          className="mt-2.5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setEditing(false)
            send(draft)
          }}
        >
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1 rounded-xl border border-line bg-bg/60 px-3 py-2 text-[16px] outline-none focus:border-accent" />
          <button className="grid size-10 place-items-center rounded-xl bg-accent text-bg" aria-label="Resend">
            <Send size={16} />
          </button>
        </form>
      ) : (
        <p className={`mt-2.5 min-h-[26px] text-[20px] leading-[1.3] font-medium tracking-[-0.4px] ${text ? 'text-white' : 'text-muted/60'}`}>
          {text ? `"${text}"` : live ? 'Listening…' : 'Ask me anything — try “What is artificial intelligence?”'}
          {live && text && <motion.span className="ml-1 inline-block h-5 w-0.5 bg-accent align-middle" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />}
        </p>
      )}
      <div className="mt-2.5 flex items-center justify-between">
        <span className="font-mono text-[10px] whitespace-pre text-muted">
          {turn?.source === 'voice' ? `EN-US  /  ${turn.confidence ? `${Math.round(turn.confidence * 100)}% confidence` : live ? 'live' : '—'}` : turn ? 'KEYBOARD INPUT' : 'READY'}
        </span>
        {turn?.raw && !editing && !live && (
          <button
            onClick={() => {
              setDraft(turn.raw)
              setEditing(true)
            }}
            className="flex items-center gap-1 text-[11px] text-accent"
          >
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>
    </motion.div>
  )
}

/** "Behind your request" — the compact trace from the Figma design, driven by real turn data. */
export function RequestTrace({ onOpenPipeline }: { onOpenPipeline: () => void }) {
  const { turn, stage, status, modelInfo, settings } = useAssistant()
  const t = turn?.telemetry
  const totalMs = t ? ns(t.total_duration) : 0
  const llmActive = stage === 4 || stage === 5
  const done = stage >= 8
  const traceLabel = status === 'error' ? 'TRACE FAILED' : done ? 'TRACE COMPLETE' : stage >= 0 ? 'TRACING…' : 'WAITING'
  const tps = t?.eval_count && t.eval_duration ? (t.eval_count / (t.eval_duration / 1e9)).toFixed(1) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <Workflow size={16} className="text-accent" /> Behind your request
        </h2>
        <button onClick={onOpenPipeline} title="Open the full pipeline">
          <Chip tone={status === 'error' ? 'err' : 'status'}>{traceLabel}</Chip>
        </button>
      </div>
      <div className="rounded-[20px] border border-line bg-bg/80 p-3.5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-accent">01</span>
              <span className="text-[13px] font-semibold">Text → tokens</span>
            </span>
            {stage > 3 && <span className="font-mono text-[10px] text-muted">≈{turn?.tokens.length} tokens</span>}
          </div>
          {turn?.tokens.length ? <TokenizationStage compact /> : <p className="font-mono text-[10px] text-muted">waiting for input…</p>}
        </div>
        <Signal lit={stage >= 4}>{turn?.telemetry?.prompt_eval_count ?? turn?.tokens.length ?? 0} tokens → numerical embeddings</Signal>
        <motion.div className="rounded-xl border border-line bg-panel p-3" animate={{ borderColor: llmActive ? 'rgba(220,235,255,0.8)' : 'rgba(102,102,109,1)' }}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-accent">02</span>
              <span className="text-[13px] font-semibold">LLM · {stage === 5 ? 'Generating' : 'Understand intent'}</span>
            </span>
            {stage > 5 && <Check size={13} className="text-accent" />}
          </div>
          <div className="mt-2 flex items-center gap-3.5">
            <div className="w-[44%] max-w-[176px] shrink-0">
              <NeuralNetworkVisualizer active={llmActive} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="truncate font-mono text-[11px]">{settings.model || '—'}{modelInfo?.parameterSize ? ` · ${modelInfo.parameterSize}` : ''}</p>
              <p className="text-[10px] leading-[1.45] text-muted">Attention connects your words and context.</p>
              <p className="font-mono text-[10px] text-accent">
                {modelInfo?.layers ?? '?'} layers{t ? ` · ${Math.round(ns(t.prompt_eval_duration) + ns(t.eval_duration))} ms` : ''}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="status">out: {turn?.outTokens.length ?? 0} tokens</Chip>
            {tps && <Chip>{tps} tokens/s</Chip>}
            {turn?.firstTokenMs && <Chip>first token {Math.round(turn.firstTokenMs)} ms</Chip>}
          </div>
        </motion.div>
        <Signal lit={stage >= 6}>text → speech synthesis</Signal>
        <motion.div className="flex items-center gap-2.5 rounded-lg bg-chip p-2.5" animate={{ opacity: stage >= 6 ? 1 : 0.5 }}>
          <span className="font-mono text-[10px] text-chip-fg">03</span>
          <span className="flex-1 text-[12px] font-medium">{done ? 'Answer delivered' : stage >= 6 ? 'Speaking answer…' : 'Voice response'}</span>
          {done && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
              <CircleCheck size={16} className="text-accent" />
            </motion.span>
          )}
        </motion.div>
        <div className="flex justify-between pt-3 font-mono text-[9px]">
          <span className="text-muted">{turn?.source === 'text' ? 'TEXT' : 'VOICE → TEXT'} → LLM → SPEECH</span>
          <span className="text-accent">{totalMs ? `${(totalMs / 1000).toFixed(1)}s model time` : ''}</span>
        </div>
      </div>
    </div>
  )
}

function Signal({ lit, children }: { lit: boolean; children: React.ReactNode }) {
  return (
    <div className="flex h-[22px] items-center gap-2 pl-4">
      <div className="relative h-full w-px overflow-hidden bg-line">
        <motion.div className="absolute inset-x-0 top-0 h-full bg-accent" initial={false} animate={{ scaleY: lit ? 1 : 0 }} style={{ originY: 0 }} />
      </div>
      <p className="font-mono text-[9px] text-muted">{children}</p>
    </div>
  )
}

export function ResponseCard() {
  const { turn, stage, status, error, messages, speakingId, paused, speakMessage, togglePause, stopSpeaking, settings } = useAssistant()
  const last = [...messages].reverse().find((m) => m.role === 'assistant')
  const streaming = stage === 5
  const text = turn?.response || (stage < 0 ? last?.content : '') || ''
  const spoken = speakingId !== null && turn ? Math.min(turn.spokenChars, text.length) : text.length
  const t = turn?.telemetry

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Orb status={status} size={22} />
          <span className="text-[11px] font-semibold tracking-[1px] text-accent">NOVA</span>
        </span>
        {last && !streaming && (
          <div className="flex items-center gap-3 text-[10px] text-muted">
            {speakingId !== null ? (
              <>
                <button onClick={togglePause} className="flex items-center gap-1 hover:text-white">
                  {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={stopSpeaking} className="flex items-center gap-1 hover:text-white">
                  <Square size={12} /> Stop
                </button>
              </>
            ) : (
              <button onClick={() => speakMessage(last.id)} className="flex items-center gap-1 hover:text-white">
                <AudioLines size={15} /> Play response
              </button>
            )}
          </div>
        )}
      </div>
      <AnimatePresence mode="wait">
        {status === 'error' ? (
          <motion.div key="err" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 rounded-xl border border-err/40 bg-err/10 p-3 text-[13px] text-err">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
          </motion.div>
        ) : text ? (
          <motion.p key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[16px] leading-[1.45] whitespace-pre-wrap">
            <span>{text.slice(0, spoken)}</span>
            <span className="text-muted">{text.slice(spoken)}</span>
            {streaming && <motion.span className="ml-0.5 inline-block h-4 w-2 rounded-sm bg-accent align-middle" animate={{ opacity: [1, 0.2] }} transition={{ repeat: Infinity, duration: 0.5 }} />}
          </motion.p>
        ) : stage === 4 ? (
          <motion.div key="think" className="flex gap-1.5 py-2">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="size-2 rounded-full bg-accent" animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
            ))}
          </motion.div>
        ) : (
          <motion.p key="empty" className="text-[14px] text-muted">
            Answers from your local model appear here{settings.autoSpeak ? ' and are read aloud' : ''}.
          </motion.p>
        )}
      </AnimatePresence>
      {t && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-xl bg-panel p-3">
          <div className="grid size-[34px] place-items-center rounded-[10px] bg-chip">
            <Cpu size={18} className="text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">Generated locally</p>
            <p className="truncate text-[11px] text-muted">
              {t.prompt_eval_count} in · {t.eval_count} out · {(ns(t.total_duration) / 1000).toFixed(2)}s{t.load_duration && ns(t.load_duration) > 500 ? ` · model load ${(ns(t.load_duration) / 1000).toFixed(1)}s` : ''}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

const SUGGESTIONS = ['What is artificial intelligence?', 'How do neural networks learn?', 'Explain tokens simply', 'Tell me a fun science fact']

export function Suggestions() {
  const { send, status } = useAssistant()
  const busy = ['processing', 'tokenizing', 'thinking', 'generating'].includes(status)
  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
      {SUGGESTIONS.map((s) => (
        <motion.button key={s} disabled={busy} whileHover={{ y: -2, borderColor: 'rgba(220,235,255,0.7)' }} whileTap={{ scale: 0.95 }} onClick={() => send(s)} className="shrink-0 rounded-full border border-line px-3 py-[9px] text-[11px] whitespace-nowrap text-muted disabled:opacity-40">
          {s}
        </motion.button>
      ))}
    </div>
  )
}

export function Composer({ onVoiceSettings }: { onVoiceSettings: () => void }) {
  const { status, startListening, stopListening, cancel, send, connection } = useAssistant()
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const listening = status === 'listening' || status === 'recording' || status === 'transcribing'
  const busy = ['processing', 'tokenizing', 'thinking', 'generating'].includes(status)

  const onMic = () => {
    if (listening) stopListening()
    else if (busy) cancel()
    else startListening()
  }

  return (
    <div className="flex flex-col items-center gap-2.5">
      <AnimatePresence>
        {typing && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex w-full gap-2 overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
              setDraft('')
            }}
          >
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your question…" className="glass flex-1 rounded-full px-4 py-3 text-[14px] outline-none placeholder:text-muted focus:border-accent" />
            <motion.button whileTap={{ scale: 0.9 }} disabled={!draft.trim() || busy} className="grid size-12 place-items-center rounded-full bg-accent text-bg disabled:opacity-40" aria-label="Send">
              <Send size={18} />
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="flex h-[70px] items-center justify-center gap-[38px]">
        <SmallRound label={typing ? 'Hide keyboard' : 'Type a message'} onClick={() => setTyping(!typing)} active={typing}>
          {typing ? <X size={21} /> : <Keyboard size={21} />}
        </SmallRound>
        <motion.button
          onClick={onMic}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          aria-label={listening ? 'Stop listening' : busy ? 'Cancel' : 'Start voice input'}
          className="relative grid size-[70px] place-items-center rounded-full border border-line bg-panel"
        >
          {listening &&
            [0, 1].map((i) => (
              <motion.span key={i} className="absolute inset-0 rounded-full border border-glow-blue" initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.8 }} />
            ))}
          <div className="relative grid size-14 place-items-center drop-shadow-[0_0_10px_rgba(220,235,255,0.25)]">
            <Orb status={status} size={56} />
            <span className="absolute inset-0 grid place-items-center text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={listening ? 'stop' : busy ? 'x' : 'mic'} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
                  {listening ? <Square size={20} fill="white" /> : busy ? <X size={24} /> : <Mic size={26} />}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
        </motion.button>
        <SmallRound label="Voice settings" onClick={onVoiceSettings}>
          <AudioLines size={21} />
        </SmallRound>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-center text-[12px] text-muted">
          {connection === 'offline' ? 'Ollama unreachable — see Model Settings for setup' : !speechRecognitionSupported && status === 'idle' ? 'Voice input needs Chrome or Edge · keyboard works everywhere' : HINT[status]}
        </motion.p>
      </AnimatePresence>
      <p className="flex items-center gap-1 text-[9px] text-muted">
        <ShieldCheck size={11} /> {listening ? 'Mic is on. Speech is transcribed by your browser.' : "Mic is off. Answers come from your local model."}
      </p>
    </div>
  )
}

function SmallRound({ label, onClick, children, active = false }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.9 }} onClick={onClick} aria-label={label} title={label} className={`grid size-11 place-items-center rounded-full border ${active ? 'border-accent text-white' : 'border-line text-accent'} bg-panel`}>
      {children}
    </motion.button>
  )
}

export function HistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { messages, clear, speakMessage } = useAssistant()
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            key="drawer"
            role="dialog"
            aria-label="Conversation history"
            className="glass fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md flex-col rounded-l-[24px] bg-bg/90"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
          >
            <div className="flex items-center justify-between border-b border-line/50 p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <History size={18} /> Conversation
              </h2>
              <div className="flex gap-2">
                <button disabled={!messages.length} onClick={clear} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-muted hover:text-err disabled:opacity-40">
                  <Trash2 size={13} /> Clear
                </button>
                <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg border border-line">
                  <X size={16} />
                </button>
              </div>
            </div>
            <motion.ol className="flex-1 space-y-3 overflow-y-auto p-5 scroll-thin" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.04 } } }}>
              {!messages.length && <p className="text-[13px] text-muted">No messages yet. Ask Nova something!</p>}
              {messages.map((m) => (
                <motion.li key={m.id} variants={{ h: { opacity: 0, y: 10 }, s: { opacity: 1, y: 0 } }} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${m.role === 'user' ? 'rounded-br-md bg-accent text-bg' : 'rounded-bl-md bg-panel'}`}>
                    {m.content}
                    <div className={`mt-1 flex items-center gap-2 font-mono text-[9px] ${m.role === 'user' ? 'text-bg/60' : 'text-muted'}`}>
                      {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {m.role === 'assistant' && (
                        <button onClick={() => speakMessage(m.id)} className="flex items-center gap-1 hover:text-white">
                          <AudioLines size={11} /> play
                        </button>
                      )}
                      {m.turn?.telemetry?.eval_count && <span>{m.turn.telemetry.eval_count} tokens</span>}
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
