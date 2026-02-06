/**
 * Artifact Types
 *
 * Core type definitions for the artifact system, aligned with chat-sdk patterns.
 * Artifacts are documents created by AI tools that display in a dedicated panel.
 */

import type { ComponentType, Dispatch, SetStateAction } from 'react';

/**
 * Supported artifact kinds
 */
export type ArtifactKind = 'text' | 'code' | 'training-block';

/**
 * Artifact streaming status
 */
export type ArtifactStatus = 'idle' | 'streaming';

/**
 * UI representation of an artifact
 * This is the runtime state shown in the artifact panel
 */
export interface UIArtifact {
  /** Unique document ID */
  documentId: string;
  /** Display title */
  title: string;
  /** Artifact type */
  kind: ArtifactKind;
  /** Document content (text/code) */
  content: string;
  /** Programming language (for code artifacts) */
  language?: string;
  /** Current streaming status */
  status: ArtifactStatus;
  /** Whether the artifact panel is visible */
  isVisible: boolean;
}

/**
 * Initial artifact state
 */
export const initialArtifact: UIArtifact = {
  documentId: '',
  title: '',
  kind: 'text',
  content: '',
  status: 'idle',
  isVisible: false,
};

/**
 * Custom data stream types for artifact streaming
 * Maps to dataStream.write({ type: 'data-X', data: Y, transient: true })
 *
 * To support concurrent document streams, some events use a compound data format
 * that includes the document ID. Events like data-language, data-textDelta, etc.
 * use the format: { value: string, docId: string } when docId is needed.
 */
export type ArtifactDataType =
  | { type: 'data-id'; data: string }
  | { type: 'data-title'; data: string | { value: string; docId: string } }
  | { type: 'data-kind'; data: ArtifactKind | { value: ArtifactKind; docId: string } }
  | { type: 'data-language'; data: string | { value: string; docId: string } }
  | { type: 'data-textDelta'; data: string | { value: string; docId: string } }
  | { type: 'data-codeDelta'; data: string | { value: string; docId: string } }
  | { type: 'data-clear'; data: null | { docId: string } }
  | { type: 'data-finish'; data: null | { docId: string } };

/**
 * Helper to extract value and docId from compound data
 */
export function extractDataValue<T>(data: T | { value: T; docId: string }): { value: T; docId?: string } {
  if (data && typeof data === 'object' && 'value' in data && 'docId' in data) {
    return { value: (data as { value: T; docId: string }).value, docId: (data as { value: T; docId: string }).docId };
  }
  return { value: data as T };
}

/**
 * Type guard for artifact data types
 */
export function isArtifactDataType(part: any): part is ArtifactDataType {
  if (!part || typeof part.type !== 'string') return false;
  return [
    'data-id',
    'data-title',
    'data-kind',
    'data-language',
    'data-textDelta',
    'data-codeDelta',
    'data-clear',
    'data-finish',
  ].includes(part.type);
}

/**
 * Artifact action - header buttons (copy, etc.)
 */
export interface ArtifactAction<M = unknown> {
  /** Unique action ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon name or component */
  icon?: string;
  /** Handler function */
  execute: (context: ArtifactActionContext<M>) => void | Promise<void>;
  /** Whether action is disabled */
  isDisabled?: (context: ArtifactActionContext<M>) => boolean;
}

/**
 * Context passed to artifact actions
 */
export interface ArtifactActionContext<M = unknown> {
  /** Current document content */
  content: string;
  /** Artifact metadata */
  metadata?: M;
  /** Copy content to clipboard */
  copyToClipboard: () => void;
}

/**
 * Props passed to artifact content components
 */
export interface ArtifactContentProps<M = unknown> {
  /** Current content */
  content: string;
  /** Streaming status */
  status: ArtifactStatus;
  /** Programming language (for code) */
  language?: string;
  /** Artifact metadata */
  metadata?: M;
  /** Update metadata */
  setMetadata?: Dispatch<SetStateAction<M | undefined>>;
}

/**
 * Artifact definition - config object for each artifact type
 * Follows chat-sdk's Artifact class pattern
 */
export interface ArtifactDefinition<T extends ArtifactKind = ArtifactKind, M = unknown> {
  /** Artifact type identifier */
  kind: T;
  /** Description for tool selection */
  description: string;
  /** React component to render artifact content */
  content: ComponentType<ArtifactContentProps<M>>;
  /** Header actions (copy, etc.) */
  actions: ArtifactAction<M>[];
  /** Process incoming stream parts */
  onStreamPart: (args: {
    streamPart: ArtifactDataType;
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    setMetadata?: Dispatch<SetStateAction<M | undefined>>;
  }) => void;
}

/**
 * Set artifact function type
 */
export type SetArtifactFn = Dispatch<SetStateAction<UIArtifact>>;

/**
 * Document handler - server-side create/update operations
 * Called by createDocument/updateDocument tools
 */
export interface DocumentHandler<T extends ArtifactKind = ArtifactKind> {
  /** Artifact kind this handler supports */
  kind: T;
  /** Create a new document */
  onCreateDocument: (args: CreateDocumentArgs) => Promise<string>;
  /** Update an existing document */
  onUpdateDocument: (args: UpdateDocumentArgs) => Promise<string>;
}

/**
 * Arguments for document creation
 */
export interface CreateDocumentArgs {
  /** Document ID */
  id: string;
  /** Document title */
  title: string;
  /** Data stream writer for sending deltas */
  dataStream: DataStreamWriter;
  /** API key for model access */
  apiKey: string;
}

/**
 * Arguments for document updates
 */
export interface UpdateDocumentArgs {
  /** Existing document */
  document: {
    id: string;
    title: string;
    content: string;
  };
  /** Update description/instructions */
  description: string;
  /** Data stream writer for sending deltas */
  dataStream: DataStreamWriter;
  /** API key for model access */
  apiKey: string;
}

/**
 * Data stream writer interface
 * Matches AI SDK's UIMessageStreamWriter pattern
 */
export interface DataStreamWriter {
  write: (data: ArtifactDataType & { transient?: boolean }) => void;
}
