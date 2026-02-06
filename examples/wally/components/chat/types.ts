import type { UIMessage } from '@ai-sdk/react';

// Re-export UIMessage for convenience
export type Message = UIMessage;

// Tool approval response callback type
export type ToolApprovalResponseFn = (response: {
  id: string;
  approved: boolean;
  reason?: string;
}) => void;

// Tool part types from the AI SDK
export interface ToolPart {
  type: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  state?:
    | 'partial-call'
    | 'call'
    | 'result'
    | 'output-available'
    | 'approval-requested'
    | 'approval-responded'
    | 'output-denied';
  result?: unknown;
  // Approval data (present when state is approval-related)
  approval?: {
    id: string;
    approved?: boolean;
    reason?: string;
  };
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

// Edit mode for messages
export type MessageMode = 'view' | 'edit';

// Props for message components
export interface MessageProps {
  message: Message;
  isStreaming?: boolean;
  isLoading?: boolean;
  onCopy?: (text: string) => void;
  onStopStreaming?: () => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
  onApprovalResponse?: ToolApprovalResponseFn;
  // Voting props
  voteState?: VoteState;
  onVote?: (messageId: string, type: 'up' | 'down') => void;
}

// Vote state for a message
export type VoteState = 'up' | 'down' | null;

export interface ActionsProps {
  content: string;
  role: 'user' | 'assistant';
  isStreaming?: boolean;
  onCopy?: (text: string) => void;
  onStopStreaming?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  // Voting props (assistant messages only)
  voteState?: VoteState;
  onVote?: (type: 'up' | 'down') => void;
}

export interface MessageEditorProps {
  message: Message;
  onSave: (newContent: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export interface CodeBlockProps {
  code: string;
  language: string;
  onCopy?: (code: string) => void;
}

export interface ToolProps {
  part: ToolPart;
  onApprovalResponse?: ToolApprovalResponseFn;
}

export interface ConversationEmptyStateProps {
  title: string;
  subtitle: string;
  /** Selected date for showing sessions (Wally-specific) */
  selectedDate?: Date;
}

// Map of messageId to vote state
export type VoteMap = Record<string, VoteState>;

export interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  error?: Error | null;
  welcomeTitle: string;
  welcomeSubtitle: string;
  onCopy?: (text: string) => void;
  onStopStreaming?: () => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
  onApprovalResponse?: ToolApprovalResponseFn;
  // Voting props
  votes?: VoteMap;
  onVote?: (messageId: string, type: 'up' | 'down') => void;
  // Optional header component rendered inside the max-width container
  header?: React.ReactNode;
  // Selected date for empty state sessions display (Wally-specific)
  selectedDate?: Date;
}

export interface PromptInputProps {
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
  // Reasoning toggle (extended thinking)
  reasoningEnabled?: boolean;
  onToggleReasoning?: () => void;
  supportsReasoning?: boolean;
  // Coaching workflow toggle
  coachingEnabled?: boolean;
  onToggleCoaching?: () => void;
}

// Ref handle for PromptInput to allow imperative control
export interface PromptInputHandle {
  /** Clear the input and dismiss any pending iOS autocorrect */
  clear: () => void;
}

// Reasoning part from AI SDK (extended thinking)
export interface ReasoningPart {
  type: 'reasoning';
  text: string;
  state?: 'streaming' | 'done';
}

export interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemove?: () => void;
}

export interface ImagePreviewProps {
  url: string;
  filename?: string;
}
