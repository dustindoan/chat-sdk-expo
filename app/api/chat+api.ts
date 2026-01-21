import { createAnthropic } from '@ai-sdk/anthropic';
import {
  streamText,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getChatById,
  saveChat,
  saveMessages,
  updateChatTitle,
} from '../../lib/db';
import { weatherTool, convertTemperatureTool } from '../../lib/ai/tools';

// Load API key from .env file
function getApiKey(): string {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {
    console.error('Failed to read .env file:', e);
  }
  return process.env.ANTHROPIC_API_KEY || '';
}

const anthropic = createAnthropic({
  apiKey: getApiKey(),
  baseURL: 'https://api.anthropic.com/v1',
});

// Transform messages from useChat format to AI SDK model format
function transformMessages(messages: any[]) {
  return messages.map((msg) => {
    if (msg.parts && Array.isArray(msg.parts)) {
      const textContent = msg.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('');
      return {
        role: msg.role,
        content: textContent,
      };
    }
    return {
      role: msg.role,
      content: msg.content || '',
    };
  });
}

// Generate a title from the first user message
function generateTitleFromMessage(message: any): string {
  let text = '';
  if (message.parts && Array.isArray(message.parts)) {
    text = message.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join(' ');
  } else if (message.content) {
    text = message.content;
  }
  // Truncate to first ~50 chars
  return text.slice(0, 50) + (text.length > 50 ? '...' : '');
}

// Generate a random UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { id: chatId, message, messages, model: modelId } = body;

  const modelName = modelId || 'claude-haiku-4-5-20251001';

  // Check if chat exists, create if not
  let chat = chatId ? await getChatById(chatId) : null;
  let isNewChat = false;

  if (!chat && message?.role === 'user') {
    // Create new chat with the first user message as title
    const title = generateTitleFromMessage(message);
    chat = await saveChat({
      id: chatId,
      title,
      model: modelName,
    });
    isNewChat = true;
  }

  // Determine which messages to use
  const uiMessages = messages || (message ? [message] : []);

  // Save user message if provided
  if (message?.role === 'user' && chat) {
    await saveMessages([
      {
        id: message.id || generateUUID(),
        chatId: chat.id,
        role: 'user',
        parts: message.parts || [{ type: 'text', text: message.content || '' }],
      },
    ]);
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: anthropic(modelName),
        system:
          'You are a helpful assistant. You can help with coding questions, general knowledge, and more. You also have tools to get weather information and convert temperatures.',
        messages: transformMessages(uiMessages),
        tools: {
          weather: weatherTool,
          convertTemperature: convertTemperatureTool,
        },
        stopWhen: stepCountIs(5),
      });

      writer.merge(result.toUIMessageStream({ sendReasoning: true }));
    },
    generateId: generateUUID,
    onFinish: async ({ messages: finishedMessages }) => {
      // Save assistant messages when streaming finishes
      if (chat && finishedMessages.length > 0) {
        await saveMessages(
          finishedMessages.map((msg) => ({
            id: msg.id,
            chatId: chat!.id,
            role: msg.role as 'user' | 'assistant' | 'system',
            parts: msg.parts,
          }))
        );

        // Update title if it was a new chat
        if (isNewChat && finishedMessages.length > 0) {
          // Could generate a better title using the assistant response
          // For now, we already set it from the user message
        }
      }
    },
    onError: (error) => {
      console.error('Stream error:', error);
      return 'An error occurred while generating the response.';
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
