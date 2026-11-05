import { motion } from 'motion/react'
import orb from '../../assets/orb.png'
import type { Status } from '../../state/AssistantContext'

const LOOK: Record<string, { scale: number[]; rotate: number; glow: string; dur: number }> = {
  idle: { scale: [1, 1.03, 1], rotate: 360, glow: 'rgb(220 235 255 / 0.25)', dur: 24 },
  listening: { scale: [1, 1.08, 1], rotate: 360, glow: 'rgb(91 140 255 / 0.6)', dur: 8 },
  recording: { scale: [1, 1.12, 0.98, 1.1, 1], rotate: 360, glow: 'rgb(91 140 255 / 0.8)', dur: 5 },
  thinking: { scale: [1, 0.94, 1], rotate: -360, glow: 'rgb(164 107 255 / 0.7)', dur: 3 },
  speaking: { scale: [1, 1.1, 1.02, 1.08, 1], rotate: 360, glow: 'rgb(255 107 213 / 0.6)', dur: 6 },
  error: { scale: [1, 1, 1], rotate: 0, glow: 'rgb(255 138 138 / 0.6)', dur: 1 },
}

function lookFor(status: Status) {
  if (status === 'listening') return LOOK.listening
  if (status === 'recording' || status === 'transcribing') return LOOK.recording
  if (['processing', 'tokenizing', 'thinking', 'generating'].includes(status)) return LOOK.thinking
  if (status === 'speaking') return LOOK.speaking
  if (status === 'error') return LOOK.error
  return LOOK.idle
}

/** The Nova avatar: one orb whose motion encodes the assistant state. */
export function Orb({ status, size = 42, rings = false }: { status: Status; size?: number; rings?: boolean }) {
  const look = lookFor(status)
  const active = status !== 'idle' && status !== 'completed'
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {rings &&
        active &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={`${status}-${i}`}
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: look.glow }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
          />
        ))}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ boxShadow: `0 0 ${size / 2.5}px ${look.glow}` }}
        transition={{ duration: 0.6 }}
      />
      <motion.img
        src={orb}
        alt=""
        draggable={false}
        className="relative size-full rounded-full object-cover"
        animate={{ scale: look.scale, rotate: look.rotate }}
        transition={{
          scale: { duration: Math.min(look.dur, 3), repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: look.dur, repeat: Infinity, ease: 'linear' },
        }}
      />
    </div>
  )
}
