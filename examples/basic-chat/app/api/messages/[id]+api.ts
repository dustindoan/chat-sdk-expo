import {
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  getChatById,
} from '../../../lib/db/queries';
import { requireAuth } from '../../../lib/auth/api';

/**
 * DELETE /api/messages/:id
 * Deletes a message and all messages that came after it (trailing messages).
 * Used when editing a user message to regenerate the conversation from that point.
 */
export async function DELETE(request: Request, { id }: { id: string }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    // Get the message to find its chatId and timestamp
    const message = await getMessageById(id);

    if (!message) {
      return Response.json({ error: 'Message not found' }, { status: 404 });
    }

    // Verify user owns the chat this message belongs to
    const chat = await getChatById(message.chatId, user.id);
    if (!chat) {
      return Response.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete this message and all messages after it
    await deleteMessagesByChatIdAfterTimestamp(message.chatId, message.createdAt);

    return Response.json({ success: true });
  } catch (err) {
    console.error('Error deleting trailing messages:', err);
    return Response.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}
