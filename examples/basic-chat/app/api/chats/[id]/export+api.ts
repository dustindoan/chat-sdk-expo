import { getChatWithMessages, type MessagePartDB } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth/api';

// GET /api/chats/:id/export - Export chat as JSON
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const { id: chatId } = await params;

    const result = await getChatWithMessages(chatId, user.id);
    if (!result) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    const { chat, messages } = result;

    // Transform messages to a cleaner export format
    const exportedMessages = messages.map((m) => ({
      role: m.role,
      content: extractTextContent(m.parts),
      createdAt: m.createdAt.toISOString(),
    }));

    const exportData = {
      exportedAt: new Date().toISOString(),
      chat: {
        id: chat.id,
        title: chat.title,
        model: chat.model,
        createdAt: chat.createdAt.toISOString(),
        messages: exportedMessages,
      },
    };

    // Return as downloadable JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="chat-${chat.id}.json"`,
      },
    });
  } catch (err) {
    console.error('Failed to export chat:', err);
    return Response.json({ error: 'Failed to export chat' }, { status: 500 });
  }
}

/**
 * Extract text content from message parts
 */
function extractTextContent(parts: MessagePartDB[]): string {
  return parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text)
    .join('\n');
}
