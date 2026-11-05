import { useCallback, useEffect, useRef, useState } from 'react'

// --- Speech recognition (Web Speech API) -----------------------------------------------------

// Minimal typings: the Web Speech API is not in TypeScript's DOM lib yet.
interface RecognitionResult {
  isFinal: boolean
  0: { transcript: string; confidence: number }
}
interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<RecognitionResult>
}
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: RecognitionEvent) => void) | null
  onspeechstart: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

const RecognitionCtor: (new () => Recognition) | undefined =
  (globalThis as any).SpeechRecognition ?? (globalThis as any).webkitSpeechRecognition

export const speechRecognitionSupported = !!RecognitionCtor

export interface RecognitionCallbacks {
  onSpeechStart?: () => void
  onInterim?: (text: string) => void
  onFinal: (text: string, confidence: number) => void
  onError: (message: string) => void
  onEnd?: () => void
}

export function useSpeechRecognition(lang = 'en-US') {
  const recRef = useRef<Recognition | null>(null)

  const start = useCallback(
    (cb: RecognitionCallbacks) => {
      if (!RecognitionCtor) {
        cb.onError('Speech recognition is not supported in this browser. Try Chrome or Edge, or type your question.')
        return
      }
      const rec = new RecognitionCtor()
      rec.lang = lang
      rec.interimResults = true
      rec.continuous = false
      let finalText = ''
      let confidence = 0
      rec.onspeechstart = () => cb.onSpeechStart?.()
      rec.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) {
            finalText += r[0].transcript
            confidence = r[0].confidence
          } else interim += r[0].transcript
        }
        cb.onInterim?.((finalText + interim).trim())
      }
      rec.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return
        cb.onError(e.error === 'not-allowed' ? 'Microphone permission was denied.' : `Speech recognition error: ${e.error}`)
      }
      rec.onend = () => {
        recRef.current = null
        cb.onEnd?.()
        if (finalText.trim()) cb.onFinal(finalText.trim(), confidence)
      }
      recRef.current = rec
      rec.start()
    },
    [lang],
  )

  const stop = useCallback(() => recRef.current?.stop(), [])
  const abort = useCallback(() => {
    if (recRef.current) {
      recRef.current.onend = null
      recRef.current.abort()
      recRef.current = null
    }
  }, [])

  useEffect(() => abort, [abort])
  return { start, stop, abort }
}

// --- Microphone level analyser (drives the live waveform) ------------------------------------

export function useMicAnalyser() {
  const analyserRef = useRef<AnalyserNode | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const [sampleRate, setSampleRate] = useState<number | null>(null)

  const open = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.75
      src.connect(analyser)
      analyserRef.current = analyser
      setSampleRate(ctx.sampleRate)
      cleanupRef.current = () => {
        stream.getTracks().forEach((t) => t.stop())
        ctx.close()
        analyserRef.current = null
      }
    } catch {
      // Waveform is decorative; recognition reports permission errors itself.
    }
  }, [])

  const close = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
  }, [])

  useEffect(() => close, [close])
  return { analyserRef, open, close, sampleRate }
}

// --- Speech synthesis -----------------------------------------------------------------------

export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const load = () => setVoices(speechSynthesis.getVoices())
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])
  return voices
}

export interface SpeakOptions {
  voiceURI?: string
  rate?: number
  onStart?: () => void
  onProgress?: (charIndex: number) => void
  onEnd?: () => void
}

/**
 * Speaks text sentence by sentence. Chrome stops long single utterances after ~15s,
 * so chunking keeps long answers playing to the end.
 */
export function speak(text: string, { voiceURI, rate = 1, onStart, onProgress, onEnd }: SpeakOptions) {
  speechSynthesis.cancel()
  const voice = speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI)
  const chunks = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text]
  let offset = 0
  let started = false
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    clearTimeout(watchdog)
    onEnd?.()
  }
  // Some browsers (no voices, headless) never fire start or error; don't wait forever.
  const watchdog = setTimeout(() => {
    if (!started) {
      speechSynthesis.cancel()
      finish()
    }
  }, 5000)
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk)
    if (voice) u.voice = voice
    u.rate = rate
    const base = offset
    offset += chunk.length
    u.onstart = () => {
      started = true
      if (i === 0) onStart?.()
    }
    u.onboundary = (e) => onProgress?.(base + e.charIndex)
    u.onend = () => {
      onProgress?.(base + chunk.length)
      if (i === chunks.length - 1) finish()
    }
    // A failed chunk would leave later chunks and the caller waiting, so stop the whole reply.
    u.onerror = (e) => {
      // Our own cancel() (Stop, or a newer reply) reports these; cancelling again would kill the newer speech.
      if (e.error === 'interrupted' || e.error === 'canceled') return finish()
      speechSynthesis.cancel()
      onProgress?.(text.length)
      finish()
    }
    speechSynthesis.speak(u)
  })
}
