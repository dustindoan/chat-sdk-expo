/**
 * @chat-sdk-expo/artifacts
 *
 * Artifact system types and handlers for AI chat applications.
 * Provides framework-agnostic types and server-side document handlers.
 */

// Types
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
} from './types';

// Type guards and utilities
export {
  initialArtifact,
  extractDataValue,
  isArtifactDataType,
} from './types';

// Re-export handlers for convenience
export {
  textDocumentHandler,
  codeDocumentHandler,
  detectLanguage,
  documentHandlers,
  documentHandlersByKind,
  getDocumentHandler,
} from './handlers';
