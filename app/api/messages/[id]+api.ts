import { getMessageById, deleteMessagesByChatIdAfterTimestamp } from '@/lib/db/queries';

/**
 * DELETE /api/messages/:id
 * Deletes a message and all messages that came after it (trailing messages).
 * Used when editing a user message to regenerate the conversation from that point.
 */
export async function DELETE(
  request: Request,
  { id }: { id: string }
) {
  try {
    // Get the message to find its chatId and timestamp
    const message = await getMessageById(id);

    if (!message) {
      return Response.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Delete this message and all messages after it
    await deleteMessagesByChatIdAfterTimestamp(message.chatId, message.createdAt);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting trailing messages:', error);
    return Response.json(
      { error: 'Failed to delete messages' },
      { status: 500 }
    );
  }
}
