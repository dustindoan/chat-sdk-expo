import { getChats, deleteAllChats } from '../../lib/db';
import { requireAuth } from '../../lib/auth/api';

// GET /api/history - List chats with pagination
export async function GET(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
    const cursor = url.searchParams.get('ending_before') ?? undefined;

    const { chats, hasMore } = await getChats({ userId: user.id, limit, cursor });

    return Response.json({ chats, hasMore });
  } catch (err) {
    console.error('Failed to fetch chat history:', err);
    return Response.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

// DELETE /api/history - Delete all chats
export async function DELETE(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { deletedCount } = await deleteAllChats(user.id);
    return Response.json({ deletedCount });
  } catch (err) {
    console.error('Failed to delete all chats:', err);
    return Response.json(
      { error: 'Failed to delete all chats' },
      { status: 500 }
    );
  }
}
