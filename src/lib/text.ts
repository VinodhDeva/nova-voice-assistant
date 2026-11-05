// Text preparation + an approximate tokenizer used for the educational visuals.

export interface NormalizeStep {
  label: string
  before: string
  after: string
}

/** The light clean-up a voice transcript gets before it goes into the chat template. */
export function normalize(raw: string): { text: string; steps: NormalizeStep[] } {
  const steps: NormalizeStep[] = []
  let t = raw
  const apply = (label: string, fn: (s: string) => string) => {
    const next = fn(t)
    steps.push({ label, before: t, after: next })
    t = next
  }
  apply('Trim & collapse whitespace', (s) => s.replace(/\s+/g, ' ').trim())
  apply('Unicode normalize (NFC)', (s) => s.normalize('NFC'))
  apply('Capitalize first letter', (s) => s.charAt(0).toUpperCase() + s.slice(1))
  apply('Ensure end punctuation', (s) => (s && !/[.?!]$/.test(s) ? s + (/^(what|who|why|how|when|where|is|are|can|do|does|should|could|will)\b/i.test(s) ? '?' : '.') : s))
  return { text: t, steps }
}

export interface ApproxToken {
  text: string
  id: number
}

// GPT-2 style pre-tokenizer regex (the same split Qwen/Llama tokenizers apply before BPE merges).
const PRE_TOKENIZE = /'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}{1,3}| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu

/**
 * shortcut: splits with the real pre-tokenizer regex, then breaks long words into ~4-char chunks
 * to mimic BPE sub-words. IDs are a stable hash, not real vocabulary IDs. Upgrade by calling a
 * real tokenizer endpoint if Ollama ever exposes one.
 */
export function approxTokenize(text: string): ApproxToken[] {
  const pieces = text.match(PRE_TOKENIZE) ?? []
  const out: ApproxToken[] = []
  for (const p of pieces) {
    const core = p.trimStart()
    if (core.length > 7 && /^\p{L}+$/u.test(core)) {
      const lead = p.length - core.length
      const split = Math.ceil(core.length / Math.ceil(core.length / 5))
      for (let i = 0; i < core.length; i += split) {
        const part = (i === 0 ? p.slice(0, lead) : '') + core.slice(i, i + split)
        out.push({ text: part, id: hashId(part) })
      }
    } else {
      out.push({ text: p, id: hashId(p) })
    }
  }
  return out
}

export function hashId(s: string, mod = 151_000) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) % mod
}

/** Deterministic pseudo-random in [0,1) for a seed; drives simulated embeddings/attention. */
export function seeded(seed: number) {
  let x = seed || 1
  return () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return ((x >>> 0) % 10000) / 10000
  }
}

/** Makes tokens readable in chips: leading space shown as a dot. */
export const showToken = (t: string) => t.replace(/^ /, '·').replace(/\n/g, '↵') || '∅'

/** Removes markdown so speech synthesis doesn't read symbols aloud. */
export function stripMarkdown(s: string) {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_#>~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
