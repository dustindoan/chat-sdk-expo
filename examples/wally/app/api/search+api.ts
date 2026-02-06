import { searchChats } from '../../lib/db';
import { requireAuth } from '../../lib/auth/api';

// GET /api/search - Search chats by message content
export async function GET(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
    const cursor = url.searchParams.get('cursor') ?? undefined;

    if (!query || query.trim().length === 0) {
      return Response.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const { chats, hasMore } = await searchChats({
      userId: user.id,
      query: query.trim(),
      limit,
      cursor,
    });

    return Response.json({ chats, hasMore });
  } catch (err) {
    console.error('Failed to search chats:', err);
    return Response.json(
      { error: 'Failed to search chats' },
      { status: 500 }
    );
  }
}
