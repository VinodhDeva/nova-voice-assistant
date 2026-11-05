# Nova · Voice AI Learning Assistant

A voice assistant for your local [Ollama](https://ollama.com) models that shows each step it takes, from your voice to its spoken answer.

**Live demo:** https://nova-voice-ai-assistant.netlify.app (it uses the Ollama on *your* computer; see [Using the hosted site](#using-the-hosted-site)).

## Run

```bash
ollama serve            # if Ollama isn't already running
npm install
npm run dev             # http://localhost:5173
```

Use Chrome or Edge for voice input. The Web Speech API is not available in Firefox, and Safari support is partial. Typing works in every browser.

## What's real and what's simulated

| Real (from Ollama) | Educational simulation |
|---|---|
| Streamed answer and output tokens | Input token split and IDs (approximated with the GPT-2 pre-tokenizer regex) |
| Next-token probabilities (`logprobs`, `top_logprobs`) | Embedding values |
| Architecture: layers, width, heads, context (`/api/show`) | Attention weights |
| Prompt/eval token counts, timings, tokens/s | Neuron activations and network diagram |

Every visual has a **Live telemetry** or **Simulation** badge, so you can always tell which kind it is.

## Particle voice animation

The Assistant screen and the Text-to-speech pipeline stage show a field of blue dots over rippling rings (`src/components/ui/ParticleVoice.tsx`). It's drawn on a 2D canvas, so it needs no extra library.

| State | What the dots do |
|---|---|
| Idle | Sparse dots drift slowly |
| Listening | The rings and a small stream follow the real microphone level |
| Thinking / generating | The dots gather into a rotating sphere |
| Speaking | The dots rise into a fountain-shaped cloud, and rings pulse on each spoken word |

Browsers don't expose speech-synthesis audio, so the speaking pulses come from word-boundary events, not loudness. The animation respects the reduced-motion setting and uses fewer dots on small screens.

## Using the hosted site

The hosted site runs in your browser and calls the Ollama on your own computer. Before it can connect, allow the site's address in Ollama, then restart Ollama:

```bash
OLLAMA_ORIGINS=https://nova-voice-ai-assistant.netlify.app ollama serve
```

If you use the Ollama menu-bar app on macOS, run `launchctl setenv OLLAMA_ORIGINS https://nova-voice-ai-assistant.netlify.app` instead, then quit and reopen Ollama. If Chrome asks to let the site access devices on your local network, choose **Allow**.

## Changelog

- Added the particle voice animation for spoken replies.
- Fixed [#1](https://github.com/VinodhDeva/nova-voice-assistant/issues/1): the history drawer closes on Escape, moves focus inside when it opens, and returns focus when it closes.
- Fixed [#2](https://github.com/VinodhDeva/nova-voice-assistant/issues/2): the conversation history survives a page reload (the last 50 messages are kept in the browser).
- Fixed [#3](https://github.com/VinodhDeva/nova-voice-assistant/issues/3): when Ollama is offline, the app says "Can't reach Ollama", keeps your question visible and retries the connection.
- Fixed [#4](https://github.com/VinodhDeva/nova-voice-assistant/issues/4): typed questions show the Voice input and Speech-to-text stages as skipped.
- Fixed [#5](https://github.com/VinodhDeva/nova-voice-assistant/issues/5): if speech synthesis fails or never starts, the turn still finishes instead of staying on "Speaking".

## Notes

- In Chrome, speech recognition goes through Google's servers. The LLM runs only on your machine.
- **Educational pacing** (on by default in Model Settings) adds short pauses to text processing and tokenization so you can watch those stages. Turn it off to run at real speed.
- `npm run check` runs a quick self-check of the text helpers.
