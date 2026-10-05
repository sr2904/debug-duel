/**
 * Post-round AI commentary: a short note comparing the two players' fixes.
 *
 * Goes through DeepSpace's AI proxy (createDeepSpaceAI), so there is no API key
 * in this repo. Billed to the app owner because any player or host can trigger it.
 * The model only sees server-recorded facts (see commentary-input.ts), and its
 * answer is checked against them; if it still contradicts the record after a
 * retry, we show no commentary rather than a wrong one. The caller handles the error.
 */

import { generateText } from 'ai'
import { createDeepSpaceAI } from 'deepspace/worker'
import type { Env } from '../../worker'
import type { CommentaryInput } from './commentary-input'
import { SYSTEM_PROMPT, buildPrompt, findContradiction } from './commentary-prompt'

const MODEL = 'claude-haiku-4-5'
const ATTEMPTS = 2

export async function writeCommentary(env: Env, input: CommentaryInput): Promise<string> {
  const ai = createDeepSpaceAI(env, 'anthropic')
  let prompt = buildPrompt(input)
  let problem: string | null = null

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const { text } = await generateText({
      model: ai(MODEL),
      system: SYSTEM_PROMPT,
      maxOutputTokens: 400,
      abortSignal: AbortSignal.timeout(25_000),
      prompt,
    })
    const commentary = text.trim()
    problem = commentary ? findContradiction(commentary, input) : 'it was empty'
    if (!problem) return commentary
    prompt = `${buildPrompt(input)}\n\nYour previous attempt was rejected because ${problem}. Write it again, using only the FACTS.`
  }
  throw new Error(`Commentary kept contradicting the recorded result: ${problem}`)
}
