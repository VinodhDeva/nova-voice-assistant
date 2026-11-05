import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { chatStream, listModels, showModel, type ChatMessage, type ModelInfo, type OllamaModel, type StreamToken, type Telemetry } from '../lib/ollama'
import { approxTokenize, normalize, stripMarkdown, type ApproxToken, type NormalizeStep } from '../lib/text'
import { speak, useMicAnalyser, useSpeechRecognition } from '../hooks/useVoice'

export type Status =
  | 'idle'
  | 'listening'
  | 'recording'
  | 'transcribing'
  | 'processing'
  | 'tokenizing'
  | 'thinking'
  | 'generating'
  | 'speaking'
  | 'completed'
  | 'error'

/** Pipeline stage index: 0 voice · 1 STT · 2 text · 3 tokens · 4 LLM · 5 generation · 6 TTS · 7 audio · 8 done */
export const STAGES = ['Voice input', 'Speech-to-text', 'Text processing', 'Tokenization', 'Neural network', 'Response generation', 'Text-to-speech', 'Audio output'] as const

export interface Turn {
  source: 'voice' | 'text'
  startedAt: number
  recordMs?: number
  interim: string
  raw: string
  confidence?: number
  normalized?: { text: string; steps: NormalizeStep[] }
  tokens: ApproxToken[]
  thinking: string
  outTokens: StreamToken[]
  response: string
  telemetry?: Telemetry
  firstTokenMs?: number
  spokenChars: number
}

export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  at: number
  turn?: Turn
}

export interface Settings {
  base: string
  model: string
  voiceURI: string
  rate: number
  autoSpeak: boolean
  think: boolean
  pacing: boolean
}

const DEFAULT_SETTINGS: Settings = {
  base: 'http://localhost:11434',
  model: '',
  voiceURI: '',
  rate: 1,
  autoSpeak: true,
  think: false,
  pacing: true,
}

const SYSTEM_PROMPT =
  'You are Nova, a friendly personal voice assistant. Your replies are read aloud, so answer in plain conversational sentences with no markdown, lists, or emojis. Keep answers to 2-4 sentences unless the user asks for more detail.'

type Connection = 'checking' | 'online' | 'offline'

interface AssistantState {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  connection: Connection
  connectionError: string
  models: OllamaModel[]
  modelInfo: ModelInfo | null
  refreshModels: () => void
  status: Status
  stage: number
  turn: Turn | null
  messages: Message[]
  error: string
  speakingId: number | null
  paused: boolean
  micAnalyser: React.RefObject<AnalyserNode | null>
  sampleRate: number | null
  startListening: () => void
  stopListening: () => void
  send: (text: string) => void
  cancel: () => void
  speakMessage: (id: number) => void
  stopSpeaking: () => void
  togglePause: () => void
  clear: () => void
}

const Ctx = createContext<AssistantState | null>(null)

export const useAssistant = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAssistant must be inside AssistantProvider')
  return c
}

function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('nova.settings') ?? '{}') }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function loadMessages(): Message[] {
  try {
    return JSON.parse(localStorage.getItem('nova.messages') ?? '[]')
  } catch {
    return []
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const emptyTurn = (source: Turn['source']): Turn => ({
  source,
  startedAt: performance.now(),
  interim: '',
  raw: '',
  tokens: [],
  thinking: '',
  outTokens: [],
  response: '',
  spokenChars: 0,
})

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings)
  const [connection, setConnection] = useState<Connection>('checking')
  const [connectionError, setConnectionError] = useState('')
  const [models, setModels] = useState<OllamaModel[]>([])
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [stage, setStage] = useState(-1)
  const [turn, setTurn] = useState<Turn | null>(null)
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [error, setError] = useState('')
  const [speakingId, setSpeakingId] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)

  const { start: recStart, stop: recStop, abort: recAbort } = useSpeechRecognition()
  const { analyserRef, open: micOpen, close: micClose, sampleRate } = useMicAnalyser()
  const abortRef = useRef<AbortController | null>(null)
  const runIdRef = useRef(0)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const modelInfoRef = useRef(modelInfo)
  modelInfoRef.current = modelInfo
  const connectionRef = useRef(connection)
  connectionRef.current = connection

  // Keep the last 50 messages across reloads; the per-turn trace is too large to store.
  useEffect(() => {
    try {
      localStorage.setItem('nova.messages', JSON.stringify(messages.slice(-50).map(({ turn: _turn, ...m }) => m)))
    } catch {
      /* storage full or unavailable: history just won't persist */
    }
  }, [messages])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      try {
        localStorage.setItem('nova.settings', JSON.stringify(next))
      } catch {
        /* storage unavailable: settings still apply for this session */
      }
      return next
    })
  }, [])

  const refreshModels = useCallback(async () => {
    setConnection('checking')
    try {
      const list = await listModels(settingsRef.current.base)
      setModels(list)
      setConnection('online')
      setConnectionError('')
      const current = settingsRef.current.model
      if (!list.some((m) => m.name === current)) updateSettings({ model: list[0]?.name ?? '' })
    } catch (e) {
      setConnection('offline')
      setModels([])
      setConnectionError(e instanceof Error ? e.message : String(e))
    }
  }, [updateSettings])

  useEffect(() => {
    refreshModels()
  }, [settings.base, refreshModels])

  useEffect(() => {
    if (!settings.model || connection !== 'online') return setModelInfo(null)
    let alive = true
    showModel(settings.base, settings.model)
      .then((info) => alive && setModelInfo(info))
      .catch(() => alive && setModelInfo(null))
    return () => {
      alive = false
    }
  }, [settings.base, settings.model, connection])

  const fail = useCallback((msg: string) => {
    setError(msg)
    setStatus('error')
    micClose()
  }, [micClose])

  const speakText = useCallback(
    (id: number, text: string, runId?: number) => {
      if (!('speechSynthesis' in window)) return
      const live = () => runId === undefined || runId === runIdRef.current
      setSpeakingId(id)
      setPaused(false)
      if (runId !== undefined) {
        setStatus('speaking')
        setStage(6)
      }
      speak(stripMarkdown(text), {
        voiceURI: settingsRef.current.voiceURI,
        rate: settingsRef.current.rate,
        onStart: () => live() && runId !== undefined && setStage(7),
        onProgress: (i) => live() && runId !== undefined && setTurn((t) => (t ? { ...t, spokenChars: i } : t)),
        onEnd: () => {
          setSpeakingId((cur) => (cur === id ? null : cur))
          if (runId !== undefined && live()) {
            setStatus('completed')
            setStage(8)
          }
        },
      })
    },
    [],
  )

  /** Runs stages 2 → 7 for a finished user utterance or typed message. */
  const runPipeline = useCallback(
    async (text: string, base: Turn) => {
      const runId = ++runIdRef.current
      const s = settingsRef.current
      const live = () => runId === runIdRef.current
      const pace = (ms: number) => (s.pacing ? wait(ms) : Promise.resolve())
      const unreachable = `Can't reach Ollama at ${s.base}. Make sure it is running; Model Settings has setup help.`
      // Show the question even when we stop early, so the user sees what failed.
      setTurn({ ...base, raw: text })
      if (!s.model) {
        setStage(-1)
        if (connectionRef.current === 'online') return fail('No Ollama model selected. Open Model Settings to choose one.')
        refreshModels()
        return fail(unreachable)
      }

      setError('')
      const history = messagesRef.current
      setMessages((m) => [...m, { id: Date.now(), role: 'user', content: text, at: Date.now() }])

      setStatus('processing')
      setStage(2)
      const normalized = normalize(text)
      setTurn({ ...base, raw: text, normalized })
      await pace(700)
      if (!live()) return

      setStatus('tokenizing')
      setStage(3)
      const tokens = approxTokenize(normalized.text)
      setTurn((t) => t && { ...t, tokens })
      await pace(900 + tokens.length * 40)
      if (!live()) return

      setStatus('thinking')
      setStage(4)
      const sent = performance.now()
      const controller = new AbortController()
      abortRef.current = controller
      const chat: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: normalized.text },
      ]
      const canThink = modelInfoRef.current?.capabilities.includes('thinking')

      // Accumulate locally so the final turn doesn't depend on React state timing.
      let acc: Turn = { ...base, raw: text, normalized, tokens }
      const push = (patch: Partial<Turn>) => {
        acc = { ...acc, ...patch }
        if (live()) setTurn(acc)
      }
      try {
        const telemetry = await chatStream({
          base: s.base,
          model: s.model,
          messages: chat,
          think: canThink ? s.think : undefined,
          signal: controller.signal,
          onThinking: (c) => push({ thinking: acc.thinking + c }),
          onToken: (tok) => {
            if (!live()) return
            if (acc.firstTokenMs === undefined) {
              setStatus('generating')
              setStage(5)
            }
            push({ firstTokenMs: acc.firstTokenMs ?? performance.now() - sent, outTokens: [...acc.outTokens, tok], response: acc.response + tok.token })
          },
        })
        if (!live()) return
        push({ telemetry })
        const reply = acc.response.trim()
        const id = Date.now() + 1
        setMessages((m) => [...m, { id, role: 'assistant', content: reply, at: Date.now(), turn: acc }])
        if (s.autoSpeak && reply) speakText(id, reply, runId)
        else {
          setStatus('completed')
          setStage(8)
        }
      } catch (e) {
        if (controller.signal.aborted || !live()) return
        // fetch() rejects with TypeError when the server can't be reached at all.
        if (e instanceof TypeError) {
          setConnection('offline')
          return fail(unreachable)
        }
        fail(e instanceof Error ? `Ollama error: ${e.message}` : String(e))
      }
    },
    [fail, speakText, refreshModels],
  )

  const startListening = useCallback(() => {
    speechSynthesis?.cancel()
    abortRef.current?.abort()
    runIdRef.current++
    setError('')
    setSpeakingId(null)
    const base = emptyTurn('voice')
    setTurn(base)
    setStatus('listening')
    setStage(0)
    micOpen()
    recStart({
      onSpeechStart: () => setStatus('recording'),
      onInterim: (text) => {
        setStatus((st) => (st === 'listening' || st === 'recording' || st === 'transcribing' ? 'transcribing' : st))
        setStage(1)
        setTurn((t) => t && { ...t, interim: text })
      },
      onEnd: () => micClose(),
      onError: fail,
      onFinal: (text, confidence) => {
        const recordMs = performance.now() - base.startedAt
        const done = { ...base, interim: text, raw: text, confidence, recordMs }
        setTurn(done)
        runPipeline(text, done)
      },
    })
  }, [micOpen, micClose, recStart, runPipeline, fail])

  const stopListening = useCallback(() => {
    recStop()
    setStatus((st) => (st === 'listening' ? 'idle' : st))
  }, [recStop])

  // When recognition ends with nothing heard, fall back to idle.
  useEffect(() => {
    if (status !== 'listening' && status !== 'recording') return
    const t = setTimeout(() => {
      setStatus((st) => (st === 'listening' || st === 'recording' ? 'idle' : st))
    }, 12000)
    return () => clearTimeout(t)
  }, [status])

  const send = useCallback(
    (text: string) => {
      if (!text.trim()) return
      speechSynthesis?.cancel()
      abortRef.current?.abort()
      recAbort()
      micClose()
      setStage(2)
      runPipeline(text.trim(), { ...emptyTurn('text'), raw: text.trim() })
    },
    [runPipeline, recAbort, micClose],
  )

  const cancel = useCallback(() => {
    runIdRef.current++
    abortRef.current?.abort()
    recAbort()
    micClose()
    speechSynthesis?.cancel()
    setSpeakingId(null)
    setStatus('idle')
    setStage(-1)
  }, [recAbort, micClose])

  const speakMessage = useCallback(
    (id: number) => {
      const m = messagesRef.current.find((x) => x.id === id)
      if (m) speakText(id, m.content)
    },
    [speakText],
  )

  const stopSpeaking = useCallback(() => {
    speechSynthesis?.cancel()
    setSpeakingId(null)
    setPaused(false)
    setStatus((st) => (st === 'speaking' ? 'completed' : st))
    setStage((sg) => (sg >= 6 && sg < 8 ? 8 : sg))
  }, [])

  const togglePause = useCallback(() => {
    if (paused) speechSynthesis.resume()
    else speechSynthesis.pause()
    setPaused(!paused)
  }, [paused])

  const clear = useCallback(() => {
    cancel()
    setMessages([])
    setTurn(null)
    setError('')
  }, [cancel])

  const value = useMemo<AssistantState>(
    () => ({
      settings,
      updateSettings,
      connection,
      connectionError,
      models,
      modelInfo,
      refreshModels,
      status,
      stage,
      turn,
      messages,
      error,
      speakingId,
      paused,
      micAnalyser: analyserRef,
      sampleRate,
      startListening,
      stopListening,
      send,
      cancel,
      speakMessage,
      stopSpeaking,
      togglePause,
      clear,
    }),
    [settings, updateSettings, connection, connectionError, models, modelInfo, refreshModels, status, stage, turn, messages, error, speakingId, paused, analyserRef, sampleRate, startListening, stopListening, send, cancel, speakMessage, stopSpeaking, togglePause, clear],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
