// Self-check: node src/lib/text.check.ts
import assert from 'node:assert/strict'
import { approxTokenize, normalize, stripMarkdown } from './text.ts'

assert.equal(normalize('  what is   AI ').text, 'What is AI?')
assert.equal(normalize('remind me to call mom').text, 'Remind me to call mom.')
const toks = approxTokenize('What is artificial intelligence?')
assert.equal(toks.map((t) => t.text).join(''), 'What is artificial intelligence?') // lossless
assert.ok(toks.length >= 5)
assert.deepEqual(approxTokenize('hi'), approxTokenize('hi')) // stable IDs
assert.equal(stripMarkdown('**Bold** and `code` [link](x)'), 'Bold and code link')
console.log('text.check ok', toks.map((t) => t.text))
