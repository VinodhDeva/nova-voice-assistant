import type { ReactNode } from 'react'

export interface Lesson {
  title: string
  summary: string
  body: ReactNode
  analogy: string
  terms: [string, string][]
}

/** One lesson per pipeline stage, shared by the pipeline view and the Learning Center. */
export const STAGE_LESSONS: Lesson[] = [
  {
    title: 'Voice input',
    summary: 'Your microphone turns air pressure into numbers.',
    body: (
      <>
        <p>Sound is a wave of tiny pressure changes in the air. The microphone's membrane moves with those waves and produces a changing voltage.</p>
        <p>The sound card <b>samples</b> that voltage thousands of times per second (usually 44,100 or 48,000 times) and stores each sample as a number. That list of numbers <em>is</em> digital audio.</p>
      </>
    ),
    analogy: 'Like a flip-book: many still snapshots per second that together recreate smooth motion.',
    terms: [
      ['Sample rate', 'How many measurements per second (Hz).'],
      ['Amplitude', 'How loud a sample is — the height of the wave.'],
      ['Frequency', 'How fast the wave vibrates — perceived as pitch.'],
    ],
  },
  {
    title: 'Speech-to-text',
    summary: 'A speech model finds word patterns in the audio.',
    body: (
      <>
        <p>The audio is cut into short frames (about 25 ms) and turned into a <b>spectrogram</b> — a picture of which frequencies are present over time.</p>
        <p>A neural network trained on thousands of hours of speech recognises sound units (phonemes) in that picture and a language model picks the most likely words. Results stream in as <em>interim</em> guesses, then settle into a <em>final</em> transcript.</p>
        <p className="text-[11px]">In this app, recognition uses your browser's Web Speech API. In Chrome that service runs on Google's servers; the LLM itself runs locally on Ollama.</p>
      </>
    ),
    analogy: 'Like recognising a friend\'s voice on a noisy phone line: you use both the sounds and what makes sense in context.',
    terms: [
      ['Spectrogram', 'Frequency-over-time image of audio.'],
      ['Phoneme', 'Smallest unit of sound, like the "k" in "cat".'],
      ['Confidence', 'How sure the recogniser is about its transcript.'],
    ],
  },
  {
    title: 'Text processing',
    summary: 'The raw transcript is cleaned and wrapped in a chat template.',
    body: (
      <>
        <p>Speech transcripts are messy: extra spaces, no punctuation, odd capitals. Light <b>normalisation</b> tidies this up so the model sees clean input.</p>
        <p>The text is then placed into a <b>chat template</b> along with a system instruction ("You are Nova…") and recent conversation history, so the model knows who is speaking and what came before.</p>
      </>
    ),
    analogy: 'Like an assistant tidying a hand-written note and clipping it to the earlier emails before passing it on.',
    terms: [
      ['Normalisation', 'Making text consistent (spacing, Unicode, punctuation).'],
      ['System prompt', 'Hidden instructions that set the assistant\'s behaviour.'],
      ['Context window', 'The maximum amount of text the model can read at once.'],
    ],
  },
  {
    title: 'Tokenization',
    summary: 'Text becomes a list of token IDs — the only thing an LLM reads.',
    body: (
      <>
        <p>LLMs never see letters or whole sentences. A <b>tokenizer</b> splits text into <b>tokens</b>: whole words, parts of words, or punctuation. Common words are one token; rare words are split, e.g. "tokenization" → "token" + "ization".</p>
        <p>Each token maps to an integer <b>ID</b> in a fixed vocabulary (often 100k–250k entries). The sentence becomes a list of numbers.</p>
        <p className="text-[11px]">Ollama does not expose its tokenizer here, so the chips show an approximation using the same pre-tokenization rule. The real prompt token count comes back from Ollama after the answer.</p>
      </>
    ),
    analogy: 'Like LEGO: any sentence can be built from a fixed box of reusable bricks.',
    terms: [
      ['Token', 'A chunk of text — word, sub-word, or symbol.'],
      ['Vocabulary', 'The fixed list of all tokens the model knows.'],
      ['BPE', 'Byte-Pair Encoding: merges frequent letter pairs into tokens.'],
    ],
  },
  {
    title: 'Neural network',
    summary: 'Transformer layers turn token vectors into meaning.',
    body: (
      <>
        <p>Each token ID is looked up in an <b>embedding table</b>, giving a long vector of numbers (thousands of them) that captures its meaning.</p>
        <p>These vectors flow through dozens of <b>transformer blocks</b>. In each block, <b>self-attention</b> lets every token look at the earlier tokens to gather context, and a <b>feed-forward network</b> transforms each token using learned <b>weights</b> and <b>biases</b>.</p>
        <p className="text-[11px]">The animated network is a simulation. Ollama reports the real architecture (layers, width, heads) but not neuron activations.</p>
      </>
    ),
    analogy: 'Like a committee reading a sentence many times: each pass, members compare notes and refine their understanding.',
    terms: [
      ['Embedding', 'A vector representing a token\'s meaning.'],
      ['Self-attention', 'Mechanism that weighs how relevant each earlier token is.'],
      ['Layer / block', 'One round of attention + feed-forward processing.'],
    ],
  },
  {
    title: 'Response generation',
    summary: 'The model predicts one token at a time, again and again.',
    body: (
      <>
        <p>At the end of the network, the model outputs a <b>probability</b> for every token in its vocabulary. One is picked (sampling), appended to the text, and the whole process repeats with the new token included.</p>
        <p>This loop is called <b>autoregressive generation</b>. It stops when the model emits a special end-of-sequence token. The probabilities you see here are real — streamed from Ollama's <em>logprobs</em>.</p>
      </>
    ),
    analogy: 'Like phone autocomplete, but extremely good, and repeated hundreds of times in a row.',
    terms: [
      ['Logits', 'Raw scores for every possible next token.'],
      ['Softmax', 'Turns scores into probabilities that sum to 100%.'],
      ['Temperature', 'Higher = more random choices; lower = safer choices.'],
    ],
  },
  {
    title: 'Text-to-speech',
    summary: 'The reply text is turned into a speech waveform.',
    body: (
      <>
        <p>The speech engine converts text to <b>phonemes</b>, predicts rhythm and intonation (<b>prosody</b>), then generates an audio waveform with a <b>vocoder</b>.</p>
        <p>This app uses your browser's built-in SpeechSynthesis voices, speaking sentence by sentence.</p>
      </>
    ),
    analogy: 'Like a musician reading sheet music: notes (text) become sound with the right timing and expression.',
    terms: [
      ['Prosody', 'Rhythm, stress and intonation of speech.'],
      ['Vocoder', 'Model that turns acoustic features into audio.'],
      ['Voice', 'A specific trained speaker the engine imitates.'],
    ],
  },
  {
    title: 'Audio output',
    summary: 'Digital samples drive your speaker to recreate sound waves.',
    body: (
      <>
        <p>The synthesised samples go to the sound card, which converts numbers back to voltage (<b>DAC</b>). The speaker cone moves with that voltage and pushes the air — the reverse of the microphone.</p>
      </>
    ),
    analogy: 'The microphone in reverse: numbers become motion, motion becomes sound.',
    terms: [
      ['DAC', 'Digital-to-analog converter.'],
      ['Buffer', 'A small queue of audio waiting to be played.'],
    ],
  },
]

export const CORE_CONCEPTS: { q: string; a: ReactNode; analogy: string }[] = [
  {
    q: 'What is a neural network?',
    a: <p>A network of simple math units ("neurons") arranged in layers. Each neuron multiplies its inputs by numbers, adds them up, and passes the result through a simple function. Stack millions of them and the network can learn very complex patterns from examples.</p>,
    analogy: 'A huge team of people each doing one small calculation and passing it on.',
  },
  {
    q: 'What are weights and biases?',
    a: <p><b>Weights</b> decide how strongly each input influences a neuron; a <b>bias</b> shifts the neuron's output up or down. Training nudges billions of these numbers until the model's predictions match the training text. A "9B" model has about 9 billion of them.</p>,
    analogy: 'Volume knobs (weights) and a baseline offset (bias) on a giant mixing desk.',
  },
  {
    q: 'What are embeddings?',
    a: <p>Vectors (lists of numbers) that place each token in a "meaning space". Similar meanings end up close together: "king" sits near "queen", "Paris" near "France".</p>,
    analogy: 'GPS coordinates for words — nearby points mean related ideas.',
  },
  {
    q: 'What is a transformer?',
    a: <p>The neural network design behind modern LLMs. It processes all tokens in parallel and is built from repeated blocks of <b>self-attention</b> and <b>feed-forward</b> layers, with shortcuts (residual connections) that keep information flowing.</p>,
    analogy: 'An assembly line of identical stations, each refining the product a little more.',
  },
  {
    q: 'What is self-attention?',
    a: <p>For each token the model asks: which earlier tokens matter for understanding me? It scores every earlier token, turns the scores into weights, and blends their information. Many <b>attention heads</b> do this in parallel, each focusing on different relationships.</p>,
    analogy: 'Reading "it" in a sentence and glancing back to see what "it" refers to.',
  },
  {
    q: 'How does the model predict the next token?',
    a: <p>The final layer produces a score for every token in the vocabulary. Softmax turns scores into probabilities, and a sampler picks one — usually a likely one, sometimes a less likely one for variety.</p>,
    analogy: 'Finishing a friend\'s sentence: you weigh what they would most likely say next.',
  },
  {
    q: 'How does it generate a complete response?',
    a: <p>It repeats next-token prediction in a loop: predict, append, predict again — until it produces an end token or hits a length limit. Each new token sees everything written before it.</p>,
    analogy: 'Laying a path one stone at a time, always looking at the stones already placed.',
  },
]
