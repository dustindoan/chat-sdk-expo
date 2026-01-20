import {
  getChats,
  deleteAllChats,
} from '../../lib/db';

// GET /api/history - List chats with pagination
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
    const cursor = url.searchParams.get('ending_before') ?? undefined;

    const { chats, hasMore } = await getChats({ limit, cursor });

    return Response.json({ chats, hasMore });
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return Response.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

// DELETE /api/history - Delete all chats
export async function DELETE() {
  try {
    const { deletedCount } = await deleteAllChats();
    return Response.json({ deletedCount });
  } catch (error) {
    console.error('Failed to delete all chats:', error);
    return Response.json(
      { error: 'Failed to delete all chats' },
      { status: 500 }
    );
  }
}
