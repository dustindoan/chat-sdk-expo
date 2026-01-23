import { saveMessages, getChatById, type MessagePartDB } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth/api';

// POST /api/chats/[id]/messages - Save messages to a chat
export async function POST(request: Request, { id }: { id: string }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    // Verify user owns this chat
    const chat = await getChatById(id, user.id);
    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Transform messages to DB format
    const dbMessages = messages.map(
      (msg: {
        id?: string;
        role: 'user' | 'assistant' | 'system';
        parts: MessagePartDB[];
      }) => ({
        id: msg.id,
        chatId: id,
        role: msg.role,
        parts: msg.parts,
      })
    );

    const savedMessages = await saveMessages(dbMessages);

    return Response.json({ messages: savedMessages }, { status: 201 });
  } catch (err) {
    console.error('Failed to save messages:', err);
    return Response.json({ error: 'Failed to save messages' }, { status: 500 });
  }
}
