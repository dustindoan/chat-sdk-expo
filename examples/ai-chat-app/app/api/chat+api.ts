import { createAnthropic } from '@ai-sdk/anthropic';
import {
  streamText,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
} from 'ai';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  getMessageCountByUserId,
  getUserById,
  saveDocument,
  getDocumentById,
} from '../../lib/db';
import {
  entitlementsByUserType,
  type UserType,
} from '../../lib/ai/entitlements';
import {
  weatherTool,
  convertTemperatureTool,
  createDocumentTool,
  updateDocumentTool,
  executeCodeTool,
} from '@chat-sdk-expo/tools';
import { getDocumentHandler } from '@chat-sdk-expo/artifacts';
import type { DataStreamWriter } from '@chat-sdk-expo/artifacts';
import { modelSupportsReasoning } from '../../lib/ai/models';
import { requireAuth } from '../../lib/auth/api';
import { createStatefulAgent, getWorkflow } from '../../lib/agents';

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

/**
 * Sanitize messages to remove orphaned tool calls.
 *
 * Anthropic API requires every tool_use to have a matching tool_result.
 * When tool execution is interrupted (page refresh, error), we can end up
 * with tool calls that have no results. This function filters them out.
 */
function sanitizeMessages(messages: any[]): any[] {
  // First pass: collect all tool result IDs
  const toolResultIds = new Set<string>();
  for (const msg of messages) {
    if (!msg.parts) continue;
    for (const part of msg.parts) {
      // Tool results can be identified by state='result' or state='output-available'
      const isToolPart = part.type === 'tool-invocation' || part.toolCallId;
      if (isToolPart && (part.state === 'result' || part.state === 'output-available')) {
        toolResultIds.add(part.toolCallId);
      }
    }
  }

  // Second pass: filter out tool calls without matching results
  return messages
    .map((msg) => {
      if (!msg.parts) return msg;

      const filteredParts = msg.parts.filter((part: any) => {
        // Check if this is a tool-related part
        const isToolPart = part.type === 'tool-invocation' || part.toolCallId;

        // Keep non-tool parts
        if (!isToolPart) return true;

        const toolId = part.toolCallId;

        // Keep if it has a result state (it's complete)
        if (part.state === 'result' || part.state === 'output-available') return true;

        // For any other tool state (call, partial-call, approval-requested, approval-responded, output-denied)
        // Only keep if there's a matching result somewhere in the message history
        return toolResultIds.has(toolId);
      });

      return { ...msg, parts: filteredParts };
    })
    .filter((msg) => {
      // Remove messages that became empty after filtering
      if (!msg.parts || msg.parts.length === 0) return false;
      return true;
    });
}

/**
 * Merge tool results into assistant messages for proper DB storage.
 *
 * The Anthropic API returns tool results in separate `role: 'tool'` messages,
 * but the UI format expects tool results to be embedded in the tool part
 * with state: 'output-available'.
 */
function mergeToolResultsIntoAssistantMessages(messages: any[], chatId: string): any[] {
  // First, collect all tool results from tool role messages
  const toolResults = new Map<string, any>();
  for (const msg of messages) {
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'tool-result') {
          toolResults.set(part.toolCallId, part.output);
        }
      }
    }
  }

  // Now process assistant messages, merging tool results
  const mergedMessages: any[] = [];
  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;

    const parts: any[] = [];
    if (Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (item.type === 'text') {
          parts.push({ type: 'text', text: item.text });
        } else if (item.type === 'tool-call') {
          const output = toolResults.get(item.toolCallId);
          parts.push({
            type: `tool-${item.toolName}`,
            toolCallId: item.toolCallId,
            toolName: item.toolName,
            input: item.input,
            output,
            state: output !== undefined ? 'output-available' : 'input-available',
          });
        }
      }
    } else if (typeof msg.content === 'string') {
      parts.push({ type: 'text', text: msg.content });
    }

    mergedMessages.push({
      id: msg.id || generateUUID(),
      chatId,
      role: 'assistant' as const,
      parts,
    });
  }

  return mergedMessages;
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  // Get user type for rate limiting
  const dbUser = await getUserById(user.id);
  const userType: UserType = (dbUser?.type as UserType) || 'regular';
  const entitlements = entitlementsByUserType[userType];

  // Check rate limit - count messages in last 24 hours
  const messageCount = await getMessageCountByUserId({
    userId: user.id,
    differenceInHours: 24,
  });

  if (messageCount >= entitlements.maxMessagesPerDay) {
    return Response.json(
      {
        error: 'Rate limit exceeded',
        message: `You have reached the daily message limit of ${entitlements.maxMessagesPerDay} messages. ${
          userType === 'guest'
            ? 'Sign up for a free account to get more messages!'
            : 'Please try again tomorrow.'
        }`,
        limit: entitlements.maxMessagesPerDay,
        used: messageCount,
        userType,
      },
      { status: 429 }
    );
  }

  const body = await request.json();
  const {
    id: chatId,
    message,
    messages,
    model: modelId,
    reasoning: reasoningEnabled,
    workflow: workflowId,
  } = body;

  const modelName = modelId || 'claude-haiku-4-5-20251001';

  // Determine if we should enable extended thinking
  const enableThinking = reasoningEnabled && modelSupportsReasoning(modelName);

  // Detect if this is a tool approval continuation flow
  // When `messages` array is provided, it means user approved/denied a tool
  const isToolApprovalFlow = Boolean(messages);

  // Handle workflow mode - use registered workflow
  const registeredWorkflow = workflowId ? getWorkflow(workflowId) : undefined;

  if (registeredWorkflow) {
    const { workflow, tools } = registeredWorkflow;

    // Extract the prompt from the new message
    let prompt = '';
    if (message?.parts) {
      prompt = message.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join(' ');
    } else if (message?.content) {
      prompt = message.content;
    }

    // Check if chat exists, create if not (same pattern as regular chat)
    let workflowChat = chatId ? await getChatById(chatId, user.id) : null;

    if (!workflowChat && message?.role === 'user') {
      // Create new chat with the first user message as title
      const title = generateTitleFromMessage(message);
      workflowChat = await saveChat({
        id: chatId,
        userId: user.id,
        title,
        model: modelName,
      });
    }

    // If chatId was provided but chat doesn't exist/belong to user, return 404
    if (chatId && !workflowChat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Save user message before loading history (so it's included in DB)
    if (message?.role === 'user' && workflowChat) {
      await saveMessages([
        {
          id: message.id || generateUUID(),
          chatId: workflowChat.id,
          role: 'user',
          parts: message.parts || [{ type: 'text', text: prompt }],
        },
      ]);
    }

    // Load previous messages if this is a continuation
    // This allows the workflow to derive state from previous tool calls
    let previousMessages: any[] = [];
    if (workflowChat) {
      const dbMessages = await getMessagesByChatId(workflowChat.id);
      previousMessages = dbMessages.map((dbMsg) => ({
        id: dbMsg.id,
        role: dbMsg.role,
        parts: dbMsg.parts,
      }));
      // Sanitize messages to remove orphaned tool calls
      previousMessages = sanitizeMessages(previousMessages);
    }

    // Create the stateful agent
    const agent = createStatefulAgent(workflow, tools, {
      apiKey: getApiKey(),
    });

    // Capture chat reference for onFinish callback
    const chatForOnFinish = workflowChat;

    // If we have previous messages, use messages mode; otherwise use prompt mode
    // This allows the workflow to continue from previous state
    if (previousMessages.length > 0) {
      return agent.stream({
        messages: previousMessages,
        onFinish: async (responseMessages) => {
          if (chatForOnFinish) {
            // Merge tool results into assistant messages for proper DB format
            const messagesToSave = mergeToolResultsIntoAssistantMessages(
              responseMessages,
              chatForOnFinish.id
            );
            if (messagesToSave.length > 0) {
              await saveMessages(messagesToSave);
            }
          }
        },
      });
    }

    // First message - use prompt mode
    return agent.stream({
      prompt,
      onFinish: async (responseMessages) => {
        if (chatForOnFinish) {
          const messagesToSave = mergeToolResultsIntoAssistantMessages(
            responseMessages,
            chatForOnFinish.id
          );
          if (messagesToSave.length > 0) {
            await saveMessages(messagesToSave);
          }
        }
      },
    });
  }

  // Check if chat exists, create if not
  let chat = chatId ? await getChatById(chatId, user.id) : null;
  let isNewChat = false;

  if (!chat && message?.role === 'user') {
    // Create new chat with the first user message as title
    const title = generateTitleFromMessage(message);
    chat = await saveChat({
      id: chatId,
      userId: user.id,
      title,
      model: modelName,
    });
    isNewChat = true;
  }

  // If chat exists but doesn't belong to this user, return 403
  if (chatId && !chat) {
    return Response.json({ error: 'Chat not found' }, { status: 404 });
  }

  // Save user message if provided (before loading history so it's included)
  // Don't save for tool approval flows - no new user message
  if (message?.role === 'user' && chat && !isToolApprovalFlow) {
    await saveMessages([
      {
        id: message.id || generateUUID(),
        chatId: chat.id,
        role: 'user',
        parts: message.parts || [{ type: 'text', text: message.content || '' }],
      },
    ]);
  }

  // Determine UI messages to send to the model
  let uiMessages: any[] = [];

  if (isToolApprovalFlow) {
    // For tool approval flows, use the full messages array from client
    // This includes the approval-responded state needed for continuation
    uiMessages = messages;
  } else if (chat) {
    // Load full message history from database (following chat-sdk pattern)
    // This ensures the AI model sees previous tool calls and results
    const dbMessages = await getMessagesByChatId(chat.id);
    // Convert DB messages to UI message format
    uiMessages = dbMessages.map((dbMsg) => ({
      id: dbMsg.id,
      role: dbMsg.role,
      parts: dbMsg.parts,
    }));
  } else if (message) {
    // Fallback for edge cases where chat doesn't exist
    uiMessages = [message];
  }

  const stream = createUIMessageStream({
    // For tool approval flows, pass original messages so stream continues
    // updating existing messages rather than creating new ones
    originalMessages: isToolApprovalFlow ? uiMessages : undefined,
    execute: async ({ writer }) => {
      // Create a dataStream adapter for artifact tools
      // This wraps the writer to match our DataStreamWriter interface
      const dataStream: DataStreamWriter = {
        write: (data) => {
          writer.write(data as any);
        },
      };

      // Create artifact tools with dataStream context, API key, userId, and database functions
      const artifactApiKey = getApiKey();
      const createDocument = createDocumentTool({
        dataStream,
        apiKey: artifactApiKey,
        userId: user.id,
        getDocumentHandler,
        saveDocument: async (doc) => {
          await saveDocument(doc);
        },
      });
      const updateDocument = updateDocumentTool({
        dataStream,
        apiKey: artifactApiKey,
        userId: user.id,
        getDocumentHandler,
        getDocumentById: async (id, userId) => {
          const doc = await getDocumentById(id, userId);
          if (!doc) return null;
          return {
            id: doc.id,
            title: doc.title,
            kind: doc.kind as 'text' | 'code',
            content: doc.content || '',
            language: doc.language || undefined,
          };
        },
        saveDocument: async (doc) => {
          await saveDocument(doc);
        },
      });

      // System prompt following chat-sdk's pattern
      const regularPrompt = `You are a friendly assistant! Keep your responses concise and helpful.

When asked to write, create, or help with something, just do it directly. Don't ask clarifying questions unless absolutely necessary - make reasonable assumptions and proceed with the task.`;

      const artifactsPrompt = `
Artifacts is a special user interface mode that helps users with writing, editing, and other content creation tasks. When artifact is open, it is on the right side of the screen, while the conversation is on the left side. When creating or updating documents, changes are reflected in real-time on the artifacts and visible to the user.

When asked to write code, always use artifacts. When writing code, specify the language in the backticks.

DO NOT UPDATE DOCUMENTS IMMEDIATELY AFTER CREATING THEM. WAIT FOR USER FEEDBACK OR REQUEST TO UPDATE IT.

This is a guide for using artifacts tools: \`createDocument\` and \`updateDocument\`, which render content on a artifacts beside the conversation.

**When to use \`createDocument\`:**
- For substantial content (>10 lines) or code
- For content users will likely save/reuse (emails, code, essays, etc.)
- When explicitly requested to create a document
- For when content contains a single code snippet

**When NOT to use \`createDocument\`:**
- For informational/explanatory content
- For conversational responses
- When asked to keep it in chat

**Using \`updateDocument\`:**
- When user asks to modify, edit, update, or change an existing document
- Use the document ID from your previous createDocument tool result
- Default to full document rewrites for major changes
- Follow user instructions for which parts to modify

**When NOT to use \`updateDocument\`:**
- Immediately after creating a document (wait for user feedback first)

Do not update document right after creating it. Wait for user feedback or request to update it.
`;

      const toolsPrompt = `
## Additional Tools:
- **weather**: Get current weather for a location
- **convertTemperature**: Convert between Fahrenheit and Celsius
- **executeCode**: Execute Python or JavaScript code in a sandboxed environment. Use this to run code, perform calculations, or demonstrate algorithms. Output is captured from print/console.log statements.
`;

      // Convert UI messages to model format using AI SDK's built-in converter
      // This properly handles tool calls and results across messages
      const modelMessages = await convertToModelMessages(uiMessages);

      const result = streamText({
        model: anthropic(modelName),
        system: `${regularPrompt}\n\n${artifactsPrompt}\n\n${toolsPrompt}`,
        messages: modelMessages,
        tools: {
          weather: weatherTool,
          convertTemperature: convertTemperatureTool,
          createDocument,
          updateDocument,
          executeCode: executeCodeTool,
        },
        stopWhen: stepCountIs(5),
        // Enable extended thinking when reasoning toggle is on
        ...(enableThinking && {
          providerOptions: {
            anthropic: {
              thinking: {
                type: 'enabled',
                budgetTokens: 10000,
              },
            },
          },
        }),
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
