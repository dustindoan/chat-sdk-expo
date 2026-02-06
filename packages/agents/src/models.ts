/**
 * Model Resolution Utilities
 *
 * Default model resolution for common providers.
 * Apps can override this by providing a custom resolveModel function.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { ModelShorthand, ModelConfig } from './types';

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

  return anthropic(modelId);
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

    return anthropic(modelId);
  };
}
