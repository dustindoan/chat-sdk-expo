/**
 * Model Resolution Utilities
 *
 * Default model resolution for common providers.
 * Apps can override this by providing a custom resolveModel function.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { wrapLanguageModel } from 'ai';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { LanguageModelMiddleware } from 'ai';
import type { ModelShorthand, ModelConfig } from './types';

/**
 * Middleware that sanitizes stringified tool-call inputs.
 *
 * Bug: The AI SDK's LanguageModelV3 spec defines tool-call input as `string`
 * (stringified JSON). During multi-step agent execution, previous steps' tool
 * calls are included in the message history with `input: string`. The Anthropic
 * provider's convert-to-anthropic-messages-prompt passes `part.input` directly
 * to the API without parsing, but the Anthropic API requires `input` to be a
 * parsed object. This middleware parses string inputs before they reach the provider.
 */
const sanitizeToolInputsMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',
  transformParams: async ({ params }) => {
    if (!params.prompt) return params;

    return {
      ...params,
      prompt: params.prompt.map(msg => {
        if (msg.role !== 'assistant' || !Array.isArray(msg.content)) return msg;
        return {
          ...msg,
          content: msg.content.map((part: any) => {
            if (part.type === 'tool-call' && typeof part.input === 'string') {
              try {
                return { ...part, input: JSON.parse(part.input) };
              } catch {
                return part;
              }
            }
            return part;
          }),
        };
      }),
    };
  },
};

/**
 * Default model shorthand mappings for Anthropic
 */
export const MODEL_SHORTHAND_MAP: Record<string, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514',
};

/**
 * Resolve a model shorthand or config to an actual model identifier
 */
export function resolveModelId(
  model: ModelShorthand | ModelConfig | undefined
): string {
  if (!model) {
    return MODEL_SHORTHAND_MAP.haiku;
  }

  if (typeof model === 'string') {
    return MODEL_SHORTHAND_MAP[model] || model;
  }

  return model.model;
}

/**
 * Get a model instance from shorthand or config
 *
 * @param model - Model shorthand (e.g., 'haiku', 'sonnet') or full config
 * @param apiKey - API key for the provider
 * @returns A model instance compatible with AI SDK
 */
export function getModel(
  model: ModelShorthand | ModelConfig | undefined,
  apiKey?: string
): LanguageModelV3 {
  const modelId = resolveModelId(model);

  // Currently only supports Anthropic
  // Apps can provide custom resolveModel for other providers
  const anthropic = createAnthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY || '',
  });

  return wrapLanguageModel({
    model: anthropic(modelId),
    middleware: sanitizeToolInputsMiddleware,
  });
}

/**
 * Model resolver function type
 */
export type ModelResolverFn = (
  model: ModelShorthand | ModelConfig | undefined
) => LanguageModelV3;

/**
 * Create a custom model resolver
 *
 * @param customMappings - Additional model shorthand mappings
 * @param apiKey - API key for the provider
 * @returns A model resolver function
 */
export function createModelResolver(
  customMappings?: Record<string, string>,
  apiKey?: string
): ModelResolverFn {
  const mappings = { ...MODEL_SHORTHAND_MAP, ...customMappings };

  return (model: ModelShorthand | ModelConfig | undefined): LanguageModelV3 => {
    const modelId = typeof model === 'string'
      ? (mappings[model] || model)
      : model?.model || mappings.haiku;

    const anthropic = createAnthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY || '',
    });

    return wrapLanguageModel({
      model: anthropic(modelId),
      middleware: sanitizeToolInputsMiddleware,
    });
  };
}
