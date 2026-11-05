// Thin client for the local Ollama REST API (https://github.com/ollama/ollama/blob/main/docs/api.md)

export interface OllamaModel {
  name: string
  size: number
  details: { family?: string; parameter_size?: string; quantization_level?: string; format?: string }
  capabilities?: string[]
}

export interface ModelInfo {
  family?: string
  parameterSize?: string
  quantization?: string
  architecture?: string
  parameterCount?: number
  layers?: number
  embeddingLength?: number
  heads?: number
  contextLength?: number
  feedForwardLength?: number
  vocabModel?: string
  capabilities: string[]
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface TopLogprob {
  token: string
  logprob: number
}

export interface StreamToken {
  token: string
  logprob?: number
  top?: TopLogprob[]
}

/** Timing + counts Ollama reports on the final streamed chunk. Durations are in nanoseconds. */
export interface Telemetry {
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

export async function listModels(base: string): Promise<OllamaModel[]> {
  const res = await fetch(`${base}/api/tags`)
  if (!res.ok) throw new Error(`Ollama responded ${res.status}`)
  const data = await res.json()
  return data.models ?? []
}

export async function showModel(base: string, model: string): Promise<ModelInfo> {
  const res = await fetch(`${base}/api/show`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  })
  if (!res.ok) throw new Error(`Could not load model info (${res.status})`)
  const data = await res.json()
  const info: Record<string, unknown> = data.model_info ?? {}
  const arch = info['general.architecture'] as string | undefined
  const num = (key: string) => (arch ? (info[`${arch}.${key}`] as number | undefined) : undefined)
  return {
    family: data.details?.family,
    parameterSize: data.details?.parameter_size,
    quantization: data.details?.quantization_level,
    architecture: arch,
    parameterCount: info['general.parameter_count'] as number | undefined,
    layers: num('block_count'),
    embeddingLength: num('embedding_length'),
    heads: num('attention.head_count'),
    contextLength: num('context_length'),
    feedForwardLength: num('feed_forward_length'),
    vocabModel: info['tokenizer.ggml.model'] as string | undefined,
    capabilities: data.capabilities ?? [],
  }
}

interface ChatOptions {
  base: string
  model: string
  messages: ChatMessage[]
  think?: boolean
  signal?: AbortSignal
  onThinking?: (chunk: string) => void
  onToken?: (tok: StreamToken) => void
}

/** Streams /api/chat. Resolves with the final telemetry once Ollama sends `done: true`. */
export async function chatStream({ base, model, messages, think, signal, onThinking, onToken }: ChatOptions): Promise<Telemetry> {
  const body: Record<string, unknown> = { model, messages, stream: true, logprobs: true, top_logprobs: 5 }
  // Only send `think` when set: models without the capability reject it.
  if (think !== undefined) body.think = think

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(text ? safeError(text) : `Ollama responded ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let telemetry: Telemetry = {}

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      const chunk = JSON.parse(line)
      if (chunk.error) throw new Error(chunk.error)
      if (chunk.message?.thinking) onThinking?.(chunk.message.thinking)
      const content: string = chunk.message?.content ?? ''
      if (content) {
        const lp = chunk.logprobs as { token: string; logprob: number; top_logprobs?: TopLogprob[] }[] | undefined
        if (lp?.length) {
          for (const l of lp) onToken?.({ token: l.token, logprob: l.logprob, top: l.top_logprobs })
        } else {
          onToken?.({ token: content })
        }
      }
      if (chunk.done) telemetry = chunk
    }
  }
  return telemetry
}

function safeError(text: string) {
  try {
    return JSON.parse(text).error ?? text
  } catch {
    return text
  }
}

export const ns = (n?: number) => (n ? n / 1e6 : 0) // nanoseconds → ms

/** The token where the model was least sure — the most instructive one to show after a reply. */
export function mostUncertain(tokens: StreamToken[]) {
  return tokens.reduce<StreamToken | undefined>((best, t) => (t.top?.length && (!best || t.top[0].logprob < best.top![0].logprob) ? t : best), undefined)
}
