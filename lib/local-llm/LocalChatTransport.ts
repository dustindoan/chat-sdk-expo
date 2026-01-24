import { streamText, type ChatTransport, type UIMessage, type UIMessageChunk } from 'ai';
import type { ModelMessage } from '@ai-sdk/provider-utils';

/**
 * Custom transport that runs inference locally via @react-native-ai/llama.
 *
 * Note: Requires the patched version of @react-native-ai/llama (see patches/ folder)
 * which fixes a bug where the first token was dropped during streaming.
 */
export class LocalChatTransport implements ChatTransport<UIMessage> {
  private model: any;

  constructor(model: any) {
    this.model = model;
  }

  async sendMessages({
    messages,
    abortSignal,
  }: {
    trigger: 'submit-message' | 'regenerate-message';
    chatId: string;
    messageId: string | undefined;
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
  }): Promise<ReadableStream<UIMessageChunk>> {
    console.log('[LocalChatTransport] sendMessages() called - using local inference');

    // Convert UIMessage[] to AI SDK ModelMessage format
    const aiMessages: ModelMessage[] = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: this.extractTextContent(msg),
    }));

    console.log('[LocalChatTransport] Starting local inference with', aiMessages.length, 'messages');

    // Run local inference with streamText
    const result = streamText({
      model: this.model,
      messages: aiMessages,
      abortSignal,
    });

    // Convert to UIMessageStream format that useChat expects
    return result.toUIMessageStream();
  }

  async reconnectToStream(_options: {
    chatId: string;
  }): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }

  private extractTextContent(msg: UIMessage): string {
    if (Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p as { type: 'text'; text: string }).text)
        .join('');
    }
    return '';
  }
}
