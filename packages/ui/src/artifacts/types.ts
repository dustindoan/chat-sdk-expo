import type { Dispatch, SetStateAction } from 'react';

/**
 * Artifact kind - extensible string type.
 * Base kinds are 'text' and 'code', but apps can add custom kinds.
 */
export type ArtifactKind = string;

/**
 * Artifact streaming status
 */
export type ArtifactStatus = 'idle' | 'streaming';

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
