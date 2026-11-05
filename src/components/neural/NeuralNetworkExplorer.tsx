import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAssistant } from '../../state/AssistantContext'
import { approxTokenize, hashId, seeded, showToken } from '../../lib/text'
import { mostUncertain, type StreamToken } from '../../lib/ollama'
import { Learn, Panel, SourceBadge, Stat } from '../ui/primitives'
import { NeuralNetworkVisualizer } from './NeuralNetworkVisualizer'
import { AttentionVisualizer } from './AttentionVisualizer'
import { NextTokenBars } from './NextTokenBars'

const EXAMPLE = 'What is artificial intelligence?'

/** Illustrative next-token candidates for the built-in example (used before any real run). */
const EXAMPLE_NEXT: StreamToken = {
  token: 'Artificial',
  top: [
    { token: 'Artificial', logprob: Math.log(0.62) },
    { token: 'AI', logprob: Math.log(0.21) },
    { token: 'It', logprob: Math.log(0.08) },
    { token: 'Great', logprob: Math.log(0.05) },
    { token: 'In', logprob: Math.log(0.02) },
  ],
}

const STEPS = [
  { id: 'tokens', title: 'Tokens', sub: 'text → IDs' },
  { id: 'embed', title: 'Embeddings', sub: 'IDs → vectors' },
  { id: 'attention', title: 'Self-attention', sub: 'tokens share context' },
  { id: 'ffn', title: 'Feed-forward', sub: 'weights & biases' },
  { id: 'output', title: 'Output probabilities', sub: 'softmax over vocab' },
  { id: 'loop', title: 'Generation loop', sub: 'append & repeat' },
] as const

export function NeuralNetworkExplorer() {
  const { turn, modelInfo, settings, stage } = useAssistant()
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  const hasRun = !!turn?.tokens.length
  const sentence = turn?.normalized?.text ?? EXAMPLE
  const tokens = useMemo(() => (hasRun ? turn!.tokens : approxTokenize(EXAMPLE)), [hasRun, turn])
  const realOut = turn?.outTokens ?? []
  const lastReal = mostUncertain(realOut)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 3200)
    return () => clearInterval(id)
  }, [playing])

  // Follow the live pipeline when a request is running.
  useEffect(() => {
    if (stage === 3) setStep(0)
    if (stage === 4) setStep(2)
    if (stage === 5) setStep(4)
  }, [stage])

  const fmt = (n?: number) => (n ? n.toLocaleString() : '—')
  return (
    <div className="space-y-5">
      <Panel className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold">
            Architecture of <span className="font-mono text-accent">{settings.model || 'your model'}</span>
          </h2>
          <SourceBadge kind="real" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Parameters" value={modelInfo?.parameterSize ?? '—'} sub={modelInfo?.parameterCount ? `${fmt(modelInfo.parameterCount)} weights` : undefined} />
          <Stat label="Layers" value={fmt(modelInfo?.layers)} sub="transformer blocks" />
          <Stat label="Embedding" value={fmt(modelInfo?.embeddingLength)} sub="numbers per token" />
          <Stat label="Attention heads" value={fmt(modelInfo?.heads)} sub="per layer" />
          <Stat label="Context" value={fmt(modelInfo?.contextLength)} sub="max tokens" />
          <Stat label="Quantization" value={modelInfo?.quantization ?? '—'} sub={modelInfo?.architecture} />
        </div>
      </Panel>

      <Panel className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-muted uppercase">{hasRun ? 'Your last request' : 'Example input'}</p>
            <p className="text-[17px] font-medium">“{sentence}”</p>
          </div>
          <div className="flex items-center gap-2">
            <SourceBadge kind="sim" />
            <button onClick={() => setPlaying(!playing)} className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[12px] font-medium text-bg">
              {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : 'Run forward pass'}
            </button>
            <button onClick={() => setStep(0)} aria-label="Restart" className="grid size-9 place-items-center rounded-full border border-line">
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Step rail */}
        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 scroll-thin">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(i)} className="relative min-w-[120px] flex-1 rounded-xl px-3 py-2 text-left">
              {step === i && <motion.span layoutId="nn-step" className="absolute inset-0 rounded-xl border border-accent/60 bg-accent/10" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
              <span className="relative block font-mono text-[9px] text-muted">{String(i + 1).padStart(2, '0')} · {s.sub}</span>
              <span className={`relative block text-[12px] font-medium ${step >= i ? 'text-white' : 'text-muted'}`}>{s.title}</span>
              <motion.span className="relative mt-1.5 block h-0.5 origin-left rounded-full bg-gradient-to-r from-glow-blue to-glow-pink" animate={{ scaleX: step >= i ? 1 : 0 }} />
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>
            {step === 0 && <TokensStep tokens={tokens} />}
            {step === 1 && <EmbedStep tokens={tokens} dims={modelInfo?.embeddingLength} />}
            {step === 2 && <AttentionStep tokens={tokens.map((t) => t.text)} heads={modelInfo?.heads} />}
            {step === 3 && <FfnStep layers={modelInfo?.layers} ffn={modelInfo?.feedForwardLength} active={stage === 4 || stage === 5 || playing} />}
            {step === 4 && <OutputStep token={lastReal ?? EXAMPLE_NEXT} real={!!lastReal} />}
            {step === 5 && <LoopStep out={realOut} />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex justify-end">
          <button onClick={() => setStep((step + 1) % STEPS.length)} className="flex items-center gap-1.5 text-[12px] text-accent">
            Next: {STEPS[(step + 1) % STEPS.length].title} <ArrowRight size={14} />
          </button>
        </div>
      </Panel>
    </div>
  )
}

function TwoCol({ visual, children }: { visual: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0">{visual}</div>
      <div className="space-y-3 text-[13px] leading-relaxed text-muted [&_b]:text-white">{children}</div>
    </div>
  )
}

function TokensStep({ tokens }: { tokens: { text: string; id: number }[] }) {
  return (
    <TwoCol
      visual={
        <div className="flex flex-wrap gap-2">
          {tokens.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 14, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.08, type: 'spring', bounce: 0.45 }} className="rounded-xl border border-line/60 bg-bg/60 px-3 py-2 text-center">
              <div className="font-mono text-[13px] whitespace-pre text-accent">{showToken(t.text)}</div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.08 }} className="font-mono text-[10px] text-muted">
                #{t.id}
              </motion.div>
            </motion.div>
          ))}
        </div>
      }
    >
      <p>The model never sees your sentence as words. A tokenizer cuts it into <b>{tokens.length} tokens</b> and swaps each one for a number from its vocabulary.</p>
      <p>A dot (·) marks a leading space — spaces are part of tokens. IDs shown are illustrative.</p>
    </TwoCol>
  )
}

function EmbedStep({ tokens, dims }: { tokens: { text: string; id: number }[]; dims?: number }) {
  const cells = 24
  return (
    <TwoCol
      visual={
        <div className="space-y-1.5">
          {tokens.slice(0, 10).map((t, r) => {
            const rand = seeded(t.id + 1)
            return (
              <div key={r} className="flex items-center gap-2">
                <span className="w-24 truncate text-right font-mono text-[11px] whitespace-pre text-accent">{showToken(t.text)}</span>
                <div className="flex flex-1 gap-[2px]">
                  {Array.from({ length: cells }, (_, c) => {
                    const v = rand() * 2 - 1
                    return (
                      <motion.span
                        key={c}
                        className="h-4 flex-1 rounded-[2px]"
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ delay: r * 0.05 + c * 0.01 }}
                        style={{ backgroundColor: v > 0 ? `rgba(91,140,255,${Math.abs(v)})` : `rgba(255,107,213,${Math.abs(v)})` }}
                        title={v.toFixed(3)}
                      />
                    )
                  })}
                </div>
                <span className="font-mono text-[9px] text-muted">…</span>
              </div>
            )
          })}
          <p className="pt-1 text-right font-mono text-[9px] text-muted">showing {cells} of {dims?.toLocaleString() ?? 'thousands of'} values · blue +, pink −</p>
        </div>
      }
    >
      <p>Each token ID picks a row from a giant <b>embedding table</b>. That row is a vector of {dims ? <b>{dims.toLocaleString()} numbers</b> : 'thousands of numbers'} for your model.</p>
      <p>Vectors for related ideas point in similar directions, so “king” lands near “queen”. These colours are illustrative — the real values live inside the model file.</p>
    </TwoCol>
  )
}

function AttentionStep({ tokens, heads }: { tokens: string[]; heads?: number }) {
  return (
    <TwoCol visual={<AttentionVisualizer tokens={tokens} />}>
      <p>In <b>self-attention</b>, each token asks: “which earlier tokens help me understand myself?” It scores them, converts scores to weights with softmax, and blends their information in.</p>
      <p>Your model runs {heads ? <b>{heads} attention heads</b> : 'many heads'} in parallel per layer, each specialising in different patterns (grammar, references, topic).</p>
      <p>Tokens can only look backwards — the grey triangle is the <b>causal mask</b>. Weights shown are simulated.</p>
    </TwoCol>
  )
}

function FfnStep({ layers, ffn, active }: { layers?: number; ffn?: number; active: boolean }) {
  const [sel, setSel] = useState(1)
  const names = ['Input', 'Hidden 1', 'Hidden 2', 'Hidden 3', 'Output']
  const info = [
    'Each token\'s vector arrives here after attention has mixed in context.',
    'Each neuron computes Σ(input × weight) + bias, then an activation function (like SiLU) decides how strongly it fires.',
    'Deeper neurons combine simpler features into more abstract ones — from letters to words to ideas.',
    'The layer projects back down to the model width so the next block can continue.',
    'The refined vector passes to the next transformer block — or, after the last one, to the output layer.',
  ]
  return (
    <TwoCol
      visual={
        <div>
          <NeuralNetworkVisualizer layers={[4, 7, 7, 7, 4]} labels={names} width={520} height={260} active={active} selected={sel} onSelect={setSel} seed={hashId('ffn')} />
          <p className="mt-1 text-center font-mono text-[9px] text-muted">click a layer · hover a neuron to trace its weights</p>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.p key={sel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <b>{names[sel]}:</b> {info[sel]}
        </motion.p>
      </AnimatePresence>
      <p>Line thickness shows the <b>weight</b> strength (blue = positive, pink = negative on hover). Training adjusted billions of these numbers.</p>
      <p>
        Your model repeats attention + feed-forward <b>{layers ?? 'dozens of'} times</b>
        {ffn ? (
          <>
            , and each feed-forward layer is <b>{ffn.toLocaleString()}</b> neurons wide
          </>
        ) : null}
        .
      </p>
    </TwoCol>
  )
}

function OutputStep({ token, real }: { token: StreamToken; real: boolean }) {
  return (
    <TwoCol
      visual={
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted">Top candidates for the next token</span>
            <SourceBadge kind={real ? 'real' : 'sim'} />
          </div>
          <NextTokenBars token={token} />
          <p className="font-mono text-[10px] text-muted">
            chosen: <span className="text-white">{showToken(token.token)}</span>
          </p>
        </div>
      }
    >
      <p>After the last layer, the model scores <b>every token in its vocabulary</b> (often 150,000+). <b>Softmax</b> turns those scores into probabilities that sum to 100%.</p>
      <p>A sampler then picks one — usually the most likely, sometimes a runner-up to keep answers natural.</p>
      <p>{real ? 'These probabilities are real, streamed from Ollama for your last answer.' : 'Ask Nova something to replace this example with real probabilities from your model.'}</p>
    </TwoCol>
  )
}

function LoopStep({ out }: { out: StreamToken[] }) {
  const seq = out.length ? out.slice(0, 40).map((t) => t.token) : ['Artificial', ' intelligence', ' is', ' the', ' ability', ' of', ' computers', ' to', ' learn', '…']
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const id = setInterval(() => setN((x) => (x >= seq.length ? 0 : x + 1)), 260)
    return () => clearInterval(id)
  }, [seq.length])
  return (
    <TwoCol
      visual={
        <div className="space-y-4">
          <div className="min-h-24 rounded-xl bg-bg/60 p-3 font-mono text-[12px] leading-relaxed">
            {seq.slice(0, n).map((t, i) => (
              <motion.span key={i} initial={{ opacity: 0, backgroundColor: 'rgba(220,235,255,0.5)' }} animate={{ opacity: 1, backgroundColor: 'rgba(220,235,255,0)' }} transition={{ duration: 0.6 }} className="rounded whitespace-pre-wrap">
                {t}
              </motion.span>
            ))}
            <motion.span className="ml-0.5 inline-block h-3.5 w-1.5 bg-accent align-middle" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} />
          </div>
          <div className="flex items-center justify-center gap-2 font-mono text-[10px] text-muted">
            {['read all tokens', 'predict next', 'append', 'repeat'].map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <motion.span className="rounded-full border border-line px-2 py-1" animate={{ borderColor: n % 4 === i ? '#dcebff' : '#66666d', color: n % 4 === i ? '#fff' : '#b8bbc2' }}>
                  {s}
                </motion.span>
                {i < 3 && <ArrowRight size={10} />}
              </span>
            ))}
          </div>
        </div>
      }
    >
      <p>Generation is a loop: predict one token, append it, and run the whole network again with the longer text. This is <b>autoregressive generation</b>.</p>
      <p>It stops at a special end-of-sequence token. {out.length ? <>Your last answer took <b>{out.length} loops</b>.</> : 'Ask a question to replay your real answer here.'}</p>
      <Learn title="Why does it stream word by word?">
        <p>Because each token depends on all the previous ones, the model can't write the end before the beginning. Streaming simply shows you each token the moment it is chosen.</p>
      </Learn>
    </TwoCol>
  )
}
