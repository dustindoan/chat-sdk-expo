import type { UIMessage } from '@ai-sdk/react';

// Re-export UIMessage for convenience
export type Message = UIMessage;

// Tool part types from the AI SDK
export interface ToolPart {
  type: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  state?: 'partial-call' | 'call' | 'result';
  result?: unknown;
  // Legacy format support
  input?: Record<string, unknown>;
  output?: unknown;
}

export interface TextPart {
  type: 'text';
  text: string;
}

export type MessagePart = TextPart | ToolPart;

// Chat status from useChat hook
export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

// Props for message components
export interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onCopy?: (text: string) => void;
  onStopStreaming?: () => void;
}

export interface MessageActionsProps {
  content: string;
  isStreaming?: boolean;
  onCopy?: (text: string) => void;
  onStopStreaming?: () => void;
}

export interface CodeBlockProps {
  code: string;
  language: string;
  onCopy?: (code: string) => void;
}

export interface ToolInvocationProps {
  part: ToolPart;
}

export interface WelcomeMessageProps {
  title: string;
  subtitle: string;
}

export interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  error?: Error | null;
  welcomeTitle: string;
  welcomeSubtitle: string;
  onCopy?: (text: string) => void;
  onStopStreaming?: () => void;
}

export interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop?: () => void;
  placeholder?: string;
  isLoading: boolean;
  selectedModel: string;
  onModelSelect?: () => void;
}
