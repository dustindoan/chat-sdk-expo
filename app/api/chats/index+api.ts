import { saveChat } from '../../../lib/db';

// POST /api/chats - Create a new chat
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { title, model } = body;

    const chat = await saveChat({
      title: title ?? 'New Chat',
      model,
    });

    return Response.json({ chat }, { status: 201 });
  } catch (error) {
    console.error('Failed to create chat:', error);
    return Response.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
