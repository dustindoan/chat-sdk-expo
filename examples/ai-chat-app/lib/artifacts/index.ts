/**
 * Artifacts Library
 *
 * Export all artifact-related types, registry, and utilities.
 * Re-exports from @chat-sdk-expo/artifacts and adds app-specific extensions.
 */

// Types (from package + app-specific extensions)
export type {
  ArtifactKind,
  ArtifactStatus,
  UIArtifact,
  ArtifactDataType,
  ArtifactActionContext,
  DocumentHandler,
  CreateDocumentArgs,
  UpdateDocumentArgs,
  DataStreamWriter,
  // App-specific React types
  ArtifactAction,
  ArtifactContentProps,
  ArtifactDefinition,
  SetArtifactFn,
} from './types';

export {
  initialArtifact,
  isArtifactDataType,
  extractDataValue,
} from './types';

// Registry (app-specific - contains React components)
export {
  textArtifact,
  codeArtifact,
  artifactDefinitions,
  artifactDefinitionsByKind,
  getArtifactDefinition,
} from './registry';

// Document handlers (re-exported from package)
export {
  textDocumentHandler,
  codeDocumentHandler,
  detectLanguage,
  documentHandlers,
  documentHandlersByKind,
  getDocumentHandler,
} from './handlers';
