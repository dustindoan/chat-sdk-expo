/**
 * Document Handlers
 *
 * Export all document handlers for artifact creation/updates.
 */

import { textDocumentHandler } from './text';
import { codeDocumentHandler } from './code';
import { trainingBlockDocumentHandler } from './training-block';
import type { DocumentHandler, ArtifactKind } from '../types';

export { textDocumentHandler } from './text';
export { codeDocumentHandler } from './code';
export { trainingBlockDocumentHandler } from './training-block';

/**
 * All document handlers
 */
export const documentHandlers: DocumentHandler[] = [
  textDocumentHandler,
  codeDocumentHandler,
  trainingBlockDocumentHandler,
];

/**
 * Document handlers by kind
 */
export const documentHandlersByKind: Record<ArtifactKind, DocumentHandler> = {
  text: textDocumentHandler,
  code: codeDocumentHandler,
  'training-block': trainingBlockDocumentHandler,
};

/**
 * Get document handler by kind
 */
export function getDocumentHandler(kind: ArtifactKind): DocumentHandler {
  return documentHandlersByKind[kind];
}
