export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: ChatModel[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude 4.5 Haiku',
    description: 'Fast and affordable',
  },
  {
    id: 'claude-sonnet-4-5-20250115',
    name: 'Claude 4.5 Sonnet',
    description: 'Balanced performance',
  },
  {
    id: 'claude-opus-4-5-20250115',
    name: 'Claude 4.5 Opus',
    description: 'Most capable',
  },
];

export const DEFAULT_MODEL_ID = 'claude-haiku-4-5-20251001';

export function getModelById(id: string): ChatModel | undefined {
  return chatModels.find((model) => model.id === id);
}

export function getModelName(id: string): string {
  return getModelById(id)?.name ?? 'Claude';
}
