export interface ChatModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'local';
  description: string;
  supportsReasoning?: boolean; // Can enable extended thinking
  supportsTools?: boolean;
  supportsVision?: boolean;

  // Local-only properties
  isLocal?: boolean;
  huggingFaceId?: string; // Format: "owner/repo/filename.gguf"
  sizeBytes?: number;
  minRamMb?: number;
}

export const chatModels: ChatModel[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude 4.5 Haiku',
    provider: 'anthropic',
    description: 'Fast and affordable',
    supportsReasoning: true,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'claude-sonnet-4-5-20250115',
    name: 'Claude 4.5 Sonnet',
    provider: 'anthropic',
    description: 'Balanced performance',
    supportsReasoning: true,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'claude-opus-4-5-20250115',
    name: 'Claude 4.5 Opus',
    provider: 'anthropic',
    description: 'Most capable',
    supportsReasoning: true,
    supportsTools: true,
    supportsVision: true,
  },
];

export const localModels: ChatModel[] = [
  {
    id: 'functiongemma-270m-local',
    name: 'FunctionGemma 270M (Local)',
    provider: 'local',
    description: 'Tool calling, on-device',
    isLocal: true,
    supportsTools: true, // Native tool calling via special tokens
    supportsVision: false,
    supportsReasoning: false,
    huggingFaceId: 'ggml-org/functiongemma-270m-it-GGUF/functiongemma-270m-it-q8_0.gguf',
    minRamMb: 512,
  },
];

export const allModels: ChatModel[] = [...chatModels, ...localModels];

export const DEFAULT_MODEL_ID = 'claude-haiku-4-5-20251001';

/**
 * Model shorthand identifiers for agents
 * Single source of truth for shorthand → model ID mapping
 */
export type ModelShorthand = 'haiku' | 'sonnet' | 'opus';

export const MODEL_SHORTHAND_MAP: Record<ModelShorthand, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5-20250115',
  opus: 'claude-opus-4-5-20250115',
};

export function getModelById(id: string): ChatModel | undefined {
  return allModels.find((model) => model.id === id);
}

export function getModelName(id: string): string {
  return getModelById(id)?.name ?? 'Claude';
}

export function modelSupportsReasoning(id: string): boolean {
  return getModelById(id)?.supportsReasoning ?? false;
}
