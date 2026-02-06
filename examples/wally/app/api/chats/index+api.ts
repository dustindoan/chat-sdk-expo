import { saveChat } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth/api';

// POST /api/chats - Create a new chat
export async function POST(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const { title, model } = body;

    const chat = await saveChat({
      userId: user.id,
      title: title ?? 'New Chat',
      model,
    });

    return Response.json({ chat }, { status: 201 });
  } catch (err) {
    console.error('Failed to create chat:', err);
    return Response.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
