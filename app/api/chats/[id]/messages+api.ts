import { saveMessages, type MessagePartDB } from '../../../../lib/db';

// POST /api/chats/[id]/messages - Save messages to a chat
export async function POST(
  request: Request,
  { id }: { id: string }
) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Transform messages to DB format
    const dbMessages = messages.map((msg: {
      id?: string;
      role: 'user' | 'assistant' | 'system';
      parts: MessagePartDB[];
    }) => ({
      id: msg.id,
      chatId: id,
      role: msg.role,
      parts: msg.parts,
    }));

    const savedMessages = await saveMessages(dbMessages);

    return Response.json({ messages: savedMessages }, { status: 201 });
  } catch (error) {
    console.error('Failed to save messages:', error);
    return Response.json(
      { error: 'Failed to save messages' },
      { status: 500 }
    );
  }
}
