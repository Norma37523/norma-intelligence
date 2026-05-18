import 'server-only';

import Anthropic from '@anthropic-ai/sdk';

import { serverEnv } from '@/shared/config/env';

import { type LLMProvider, LLMNotConfiguredError } from './llm-provider';

const MODEL_ID = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Anthropic Claude adapter. Constructed lazily — fails fast at the call site
 * with LLMNotConfiguredError if ANTHROPIC_API_KEY isn't set, instead of at
 * module load.
 */
export function createAnthropicProvider(): LLMProvider {
  return {
    name: 'anthropic',
    modelId: MODEL_ID,

    async generateNarrative({ system, user, maxTokens, temperature }): Promise<string> {
      const apiKey = serverEnv.ANTHROPIC_API_KEY;
      if (!apiKey) throw new LLMNotConfiguredError();

      const client = new Anthropic({ apiKey, timeout: DEFAULT_TIMEOUT_MS });

      const response = await client.messages.create({
        model: MODEL_ID,
        max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: temperature ?? 0.3,
        system,
        messages: [{ role: 'user', content: user }],
      });

      // Concatenate any text blocks; ignore tool_use etc. since we don't request tools.
      const text = response.content
        .filter((c): c is Anthropic.TextBlock => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
        .trim();

      return text;
    },
  };
}

/** Singleton factory used by the pipeline. Returns null if not configured. */
export function tryCreateLLMProvider(): LLMProvider | null {
  try {
    if (!serverEnv.ANTHROPIC_API_KEY) return null;
    return createAnthropicProvider();
  } catch {
    return null;
  }
}
