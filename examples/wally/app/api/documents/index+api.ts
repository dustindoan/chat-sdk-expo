/**
 * Documents API Route
 *
 * GET /api/documents?id=X - Get all versions of a document
 * DELETE /api/documents?id=X&timestamp=Y - Delete versions after timestamp
 */

import {
  getDocumentsById,
  deleteDocumentsByIdAfterTimestamp,
} from '../../../lib/db/queries';
import { requireAuth } from '../../../lib/auth/api';

export async function GET(request: Request): Promise<Response> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return Response.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const documents = await getDocumentsById(id, user.id);

    return Response.json(documents);
  } catch (err) {
    console.error('Failed to get document versions:', err);
    return Response.json(
      { error: 'Failed to get document versions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const timestamp = url.searchParams.get('timestamp');

    if (!id) {
      return Response.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    if (!timestamp) {
      return Response.json(
        { error: 'Timestamp is required' },
        { status: 400 }
      );
    }

    const deletedDocuments = await deleteDocumentsByIdAfterTimestamp(
      id,
      user.id,
      new Date(timestamp)
    );

    return Response.json({
      deleted: deletedDocuments.length,
      documents: deletedDocuments,
    });
  } catch (err) {
    console.error('Failed to delete document versions:', err);
    return Response.json(
      { error: 'Failed to delete document versions' },
      { status: 500 }
    );
  }
}
