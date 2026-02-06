/**
 * Artifacts Library
 *
 * Export all artifact-related types, registry, and utilities.
 */

// Types
export type {
  ArtifactKind,
  ArtifactStatus,
  UIArtifact,
  ArtifactDataType,
  ArtifactAction,
  ArtifactActionContext,
  ArtifactContentProps,
  ArtifactDefinition,
  SetArtifactFn,
  DocumentHandler,
  CreateDocumentArgs,
  UpdateDocumentArgs,
  DataStreamWriter,
} from './types';

export { initialArtifact, isArtifactDataType } from './types';

// Registry
export {
  textArtifact,
  codeArtifact,
  artifactDefinitions,
  artifactDefinitionsByKind,
  getArtifactDefinition,
} from './registry';
