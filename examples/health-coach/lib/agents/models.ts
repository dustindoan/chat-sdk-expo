/**
 * Model Configuration Utilities
 *
 * Helpers for resolving model shorthand identifiers to full configurations.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { wrapLanguageModel } from 'ai';
import type { LanguageModelMiddleware } from 'ai';
import { MODEL_SHORTHAND_MAP } from '../ai/models';
import type { ModelShorthand, ModelConfig } from './types';

/**
 * Middleware that sanitizes stringified tool-call inputs.
 *
 * Bug: The AI SDK's LanguageModelV3 spec defines tool-call input as `string`
 * (stringified JSON). During multi-step agent execution, previous steps' tool
 * calls are included in the message history with `input: string`. The Anthropic
 * provider passes `part.input` directly to the API without parsing, but the
 * Anthropic API requires `input` to be a parsed object. This middleware parses
 * string inputs before they reach the provider.
 */
const sanitizeToolInputsMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',
  transformParams: async ({ params }) => {
    if (!params.prompt) return params;

    let fixCount = 0;

    const result = {
      ...params,
      prompt: params.prompt.map((msg, msgIdx) => {
        if (msg.role !== 'assistant' || !Array.isArray(msg.content)) return msg;
        return {
          ...msg,
          content: msg.content.map((part: any, partIdx) => {
            // Fix any part type that has a string `input` field — the Anthropic API
            // requires `input` to be a parsed object for tool_use blocks. This covers
            // both 'tool-call' (AI SDK v3 format) and any other format the SDK uses.
            if (typeof part.input === 'string' && (part.type === 'tool-call' || part.type === 'tool_use' || part.toolName)) {
              fixCount++;
              const toolId = part.toolName || part.name || 'unknown';
              console.warn(`[middleware] Fixing ${part.type} string input at msg[${msgIdx}] (${toolId})`);
              try {
                return { ...part, input: JSON.parse(part.input) };
              } catch {
                // If we can't parse the input, replace with an empty object to prevent API errors.
                // The tool call was already broken (malformed JSON from the LLM), so this is
                // the safest recovery — the API won't reject the request, and the tool result
                // (which is likely an error) still carries forward.
                console.warn(`[middleware] Unparseable input for ${toolId}, replacing with empty object`);
                return { ...part, input: {} };
              }
            }
            return part;
          }),
        };
      }),
    };
    if (fixCount > 0) {
      console.warn(`[middleware] Fixed ${fixCount} string tool-call inputs`);
    }
    return result;
  },
};

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

    return wrapLanguageModel({
      model: anthropic(modelId),
      middleware: sanitizeToolInputsMiddleware,
    });
  }

  // Handle full config
  const { provider, model } = modelOrShorthand;

  if (provider === 'anthropic') {
    const anthropic = createAnthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: 'https://api.anthropic.com/v1',
    });
    return wrapLanguageModel({
      model: anthropic(model),
      middleware: sanitizeToolInputsMiddleware,
    });
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
