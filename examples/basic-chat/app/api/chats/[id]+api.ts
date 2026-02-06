import {
  getChatById,
  getMessagesByChatId,
  updateChatTitle,
  deleteChatById,
} from '../../../lib/db';
import { requireAuth } from '../../../lib/auth/api';

// GET /api/chats/[id] - Get a single chat with messages
export async function GET(request: Request, { id }: { id: string }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const chat = await getChatById(id, user.id);
    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    const messages = await getMessagesByChatId(id);

    return Response.json({ chat, messages });
  } catch (err) {
    console.error('Failed to fetch chat:', err);
    return Response.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// PATCH /api/chats/[id] - Update chat (title)
export async function PATCH(request: Request, { id }: { id: string }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { title } = await request.json();

    if (title) {
      await updateChatTitle(id, user.id, title);
    }

    const chat = await getChatById(id, user.id);
    return Response.json({ chat });
  } catch (err) {
    console.error('Failed to update chat:', err);
    return Response.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

// DELETE /api/chats/[id] - Delete a chat
export async function DELETE(request: Request, { id }: { id: string }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    await deleteChatById(id, user.id);
    return Response.json({ success: true });
  } catch (err) {
    console.error('Failed to delete chat:', err);
    return Response.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}
