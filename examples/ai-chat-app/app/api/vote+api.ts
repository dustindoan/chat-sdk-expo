import { getVotesByChatId, voteMessage, getChatById } from '../../lib/db/queries';
import { requireAuth } from '../../lib/auth/api';

/**
 * GET /api/vote?chatId=X
 * Retrieves all votes for a specific chat
 */
export async function GET(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const url = new URL(request.url);
  const chatId = url.searchParams.get('chatId');

  if (!chatId) {
    return Response.json({ error: 'chatId is required' }, { status: 400 });
  }

  try {
    // Verify user owns the chat
    const chat = await getChatById(chatId, user.id);
    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    const votes = await getVotesByChatId(chatId);
    return Response.json(votes);
  } catch (err) {
    console.error('Error fetching votes:', err);
    return Response.json({ error: 'Failed to fetch votes' }, { status: 500 });
  }
}

/**
 * PATCH /api/vote
 * Records a vote on a message
 * Body: { chatId: string, messageId: string, type: 'up' | 'down' }
 */
export async function PATCH(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { chatId, messageId, type } = await request.json();

    if (!chatId || !messageId || !type) {
      return Response.json(
        { error: 'chatId, messageId, and type are required' },
        { status: 400 }
      );
    }

    if (type !== 'up' && type !== 'down') {
      return Response.json(
        { error: 'type must be "up" or "down"' },
        { status: 400 }
      );
    }

    // Verify user owns the chat
    const chat = await getChatById(chatId, user.id);
    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    await voteMessage({ chatId, messageId, type });

    return Response.json({ message: 'Vote recorded successfully' });
  } catch (err) {
    console.error('Error recording vote:', err);
    return Response.json({ error: 'Failed to record vote' }, { status: 500 });
  }
}
