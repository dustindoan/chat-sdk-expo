/**
 * Document Handlers
 *
 * Export all document handlers for artifact creation/updates.
 */

import { textDocumentHandler } from './text';
import { codeDocumentHandler } from './code';
import type { DocumentHandler, ArtifactKind } from '../types';

export { textDocumentHandler } from './text';
export { codeDocumentHandler } from './code';

/**
 * All document handlers
 */
export const documentHandlers: DocumentHandler[] = [
  textDocumentHandler,
  codeDocumentHandler,
];

/**
 * Document handlers by kind
 */
export const documentHandlersByKind: Record<ArtifactKind, DocumentHandler> = {
  text: textDocumentHandler,
  code: codeDocumentHandler,
};

/**
 * Get document handler by kind
 */
export function getDocumentHandler(kind: ArtifactKind): DocumentHandler {
  return documentHandlersByKind[kind];
}
