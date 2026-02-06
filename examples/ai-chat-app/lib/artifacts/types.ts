/**
 * Artifact Types
 *
 * Core type definitions for the artifact system, aligned with chat-sdk patterns.
 * Artifacts are documents created by AI tools that display in a dedicated panel.
 *
 * Re-exports base types from @chat-sdk-expo/artifacts and adds React-specific types.
 */

import type { ComponentType, Dispatch, SetStateAction } from 'react';

// Re-export base types from package
export type {
  ArtifactKind,
  ArtifactStatus,
  UIArtifact,
  ArtifactDataType,
  ArtifactActionContext,
  ArtifactContentPropsBase,
  DocumentHandler,
  CreateDocumentArgs,
  UpdateDocumentArgs,
  DataStreamWriter,
} from '@chat-sdk-expo/artifacts';

export {
  initialArtifact,
  extractDataValue,
  isArtifactDataType,
} from '@chat-sdk-expo/artifacts';

// Import types for use in React-specific extensions
import type {
  ArtifactKind,
  ArtifactStatus,
  ArtifactDataType,
  ArtifactActionContext,
  UIArtifact,
} from '@chat-sdk-expo/artifacts';

/**
 * Artifact action - header buttons (copy, etc.)
 * React-specific extension with handler functions
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
 * Props passed to artifact content components
 * React-specific extension with setMetadata
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
 * React-specific - includes React component for content
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
