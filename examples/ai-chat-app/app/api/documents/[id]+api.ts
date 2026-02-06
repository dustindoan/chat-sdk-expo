/**
 * Document API Route
 *
 * GET /api/documents/[id] - Get document by ID
 * POST /api/documents/[id] - Create or update document
 */

import { requireAuth } from '../../../lib/auth/api';
import { getDocumentById, saveDocument } from '../../../lib/db/queries';

export async function GET(
  request: Request,
  { id }: { id: string }
): Promise<Response> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const document = await getDocumentById(id, user.id);

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    return Response.json(document);
  } catch (error) {
    console.error('Failed to get document:', error);
    return Response.json({ error: 'Failed to get document' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { id }: { id: string }
): Promise<Response> {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const body = await request.json();

    const document = await saveDocument({
      id,
      userId: user.id,
      title: body.title,
      content: body.content,
      kind: body.kind || 'text',
      language: body.language,
    });

    return Response.json(document);
  } catch (error) {
    console.error('Failed to save document:', error);
    return Response.json({ error: 'Failed to save document' }, { status: 500 });
  }
}
