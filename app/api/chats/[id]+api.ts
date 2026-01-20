import {
  getChatById,
  getMessagesByChatId,
  updateChatTitle,
  deleteChatById,
} from '../../../lib/db';

// GET /api/chats/[id] - Get a single chat with messages
export async function GET(
  request: Request,
  { id }: { id: string }
) {
  try {
    const chat = await getChatById(id);
    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    const messages = await getMessagesByChatId(id);

    return Response.json({ chat, messages });
  } catch (error) {
    console.error('Failed to fetch chat:', error);
    return Response.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// PATCH /api/chats/[id] - Update chat (title)
export async function PATCH(
  request: Request,
  { id }: { id: string }
) {
  try {
    const { title } = await request.json();

    if (title) {
      await updateChatTitle(id, title);
    }

    const chat = await getChatById(id);
    return Response.json({ chat });
  } catch (error) {
    console.error('Failed to update chat:', error);
    return Response.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

// DELETE /api/chats/[id] - Delete a chat
export async function DELETE(
  _request: Request,
  { id }: { id: string }
) {
  try {
    await deleteChatById(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chat:', error);
    return Response.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}
