import 'server-only';

/**
 * Provider-agnostic interface for narrative generation.
 * Anthropic is the default impl; can be swapped with OpenAI etc. by changing
 * the factory in `createLLMProvider()`.
 */
export interface LLMProvider {
  readonly name: string;
  readonly modelId: string;
  /**
   * Generate a Brazilian-Portuguese narrative for a financial finding.
   * `system` is the role prompt; `user` is the structured payload.
   * Returns the model's response text (no streaming).
   */
  generateNarrative(args: {
    system: string;
    user: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string>;
}

export class LLMNotConfiguredError extends Error {
  constructor() {
    super('LLM provider não configurado (ANTHROPIC_API_KEY ausente).');
    this.name = 'LLMNotConfiguredError';
  }
}
