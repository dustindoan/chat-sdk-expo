/**
 * Model Configuration Utilities
 *
 * Helpers for resolving model shorthand identifiers to full configurations.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { MODEL_SHORTHAND_MAP } from '../ai/models';
import type { ModelShorthand, ModelConfig } from './types';

/**
 * Resolve a model shorthand or config to a model instance
 */
export function getModel(
  modelOrShorthand: ModelShorthand | ModelConfig | undefined,
  apiKey?: string
) {
  // Default to sonnet if not specified
  if (!modelOrShorthand) {
    modelOrShorthand = 'sonnet';
  }

  // Handle shorthand
  if (typeof modelOrShorthand === 'string') {
    const modelId = MODEL_SHORTHAND_MAP[modelOrShorthand];
    if (!modelId) {
      throw new Error(`Unknown model shorthand: ${modelOrShorthand}`);
    }

    const anthropic = createAnthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: 'https://api.anthropic.com/v1',
    });

    return anthropic(modelId);
  }

  // Handle full config
  const { provider, model } = modelOrShorthand;

  if (provider === 'anthropic') {
    const anthropic = createAnthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: 'https://api.anthropic.com/v1',
    });
    return anthropic(model);
  }

  // Add other providers here as needed
  throw new Error(`Unknown model provider: ${provider}`);
}

/**
 * Get the model ID string for a shorthand or config
 */
export function getModelId(
  modelOrShorthand: ModelShorthand | ModelConfig | undefined
): string {
  if (!modelOrShorthand) {
    return MODEL_SHORTHAND_MAP.sonnet;
  }

  if (typeof modelOrShorthand === 'string') {
    return MODEL_SHORTHAND_MAP[modelOrShorthand] || modelOrShorthand;
  }

  return modelOrShorthand.model;
}
