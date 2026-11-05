# Nova · Voice AI Learning Assistant

A voice assistant for your local [Ollama](https://ollama.com) models that shows each step it takes, from your voice to its spoken answer.

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

## Notes

- In Chrome, speech recognition goes through Google's servers. The LLM runs only on your machine.
- **Educational pacing** (on by default in Model Settings) adds short pauses to text processing and tokenization so you can watch those stages. Turn it off to run at real speed.
- `npm run check` runs a quick self-check of the text helpers.
