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

// File part for images and attachments (matches AI SDK FileUIPart)
export interface FilePart {
  type: 'file';
  mediaType: string;
  filename?: string;
  url: string; // Data URL (base64) or HTTP URL
}

// Attachment state for pending uploads (before message is sent)
export interface Attachment {
  id: string;
  filename: string;
  mediaType: string;
  url: string; // Data URL
  isUploading?: boolean;
}

export type MessagePart = TextPart | ToolPart | FilePart;

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
  // File attachment support
  attachments?: Attachment[];
  onAddAttachment?: () => void;
  onRemoveAttachment?: (id: string) => void;
}

export interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemove?: () => void;
}

export interface ImagePreviewProps {
  url: string;
  filename?: string;
}
