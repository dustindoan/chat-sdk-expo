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
  getDocumentTool,
  executeCodeTool,
  getTodaySessionsTool,
} from '../../lib/ai/tools';
import { modelSupportsReasoning } from '../../lib/ai/models';
import type { DataStreamWriter } from '../../lib/artifacts/types';
import { createDeferredDataStream } from '../../lib/ai/deferred-data-stream';
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

  // Handle workflow mode - use registered workflow (e.g., 'coaching')
  const registeredWorkflow = workflowId ? getWorkflow(workflowId) : undefined;

  if (registeredWorkflow) {
    const { workflow, tools: staticTools } = registeredWorkflow;

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

    // Ensure chat exists for persistence
    let workflowChat = chatId ? await getChatById(chatId, user.id) : null;
    if (!workflowChat && message?.role === 'user') {
      const title = generateTitleFromMessage(message);
      workflowChat = await saveChat({
        id: chatId,
        userId: user.id,
        title,
        model: modelName,
      });
    }

    // Save the user message BEFORE loading history
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

    // Helper to ensure tool input/output are objects, not strings.
    const parseIfString = (value: any): any => {
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return value; }
      }
      return value;
    };

    // Helper to normalize tool parts from DB format to AI SDK v6 UI format.
    // Returns null for corrupted parts that should be dropped.
    const normalizeToolPart = (part: any): any | null => {
      if (part.type === 'tool-invocation') {
        const parsedInput = parseIfString(part.args || part.input);
        const parsedOutput = parseIfString(part.result || part.output);

        // Drop corrupted tool parts: input still a string after parsing = malformed JSON
        if (typeof parsedInput === 'string' && typeof (part.args || part.input) === 'string') {
          console.warn(`[normalize] Dropping corrupted tool-invocation ${part.toolName}: unparseable input`);
          return null;
        }

        return {
          type: `tool-${part.toolName}`,
          toolCallId: part.toolInvocationId || part.toolCallId,
          toolName: part.toolName,
          input: parsedInput,
          output: parsedOutput,
          state: part.state === 'result' ? 'output-available' : (part.state || 'output-available'),
        };
      }
      if (part.type?.startsWith('tool-') && part.type !== 'tool-invocation') {
        const parsedInput = parseIfString(part.input);
        const parsedOutput = parseIfString(part.output);

        // Drop corrupted tool parts: input still a string after parsing = malformed JSON.
        // This happens when the LLM produces garbled tool call arguments (e.g., mixed JSON + XML).
        if (typeof part.input === 'string' && typeof parsedInput === 'string') {
          console.warn(`[normalize] Dropping corrupted tool part ${part.toolName}: unparseable input`);
          return null;
        }

        return {
          ...part,
          input: parsedInput,
          output: parsedOutput,
        };
      }
      return part;
    };

    const normalizeMessageParts = (parts: any[]): any[] => {
      if (!Array.isArray(parts)) return parts;
      return parts.map(normalizeToolPart).filter((p): p is any => p !== null);
    };

    // Load previous messages (now includes the user message we just saved)
    let previousMessages: any[] = [];
    if (workflowChat) {
      const dbMessages = await getMessagesByChatId(workflowChat.id);
      previousMessages = dbMessages.map((dbMsg) => ({
        id: dbMsg.id,
        role: dbMsg.role,
        parts: normalizeMessageParts(dbMsg.parts as any[]),
      }));
      console.log(`[workflow] Loading ${previousMessages.length} messages, total size: ${JSON.stringify(previousMessages).length} chars`);
    }

    // Create deferred DataStreamWriter for artifact tools.
    // The proxy queues writes until attach() wires it to the real writer
    // inside createUIMessageStream's execute callback.
    const { proxy: deferredDataStream, attach: attachDataStream } = createDeferredDataStream();

    // Shared mutable ref for planDraft content bypass.
    // ASSESS populates this via onStepFinish; createDocument/updateDocument
    // consume it automatically so the LLM doesn't have to echo 50k+ of JSON.
    //
    // Seed from previous round's scratchpad so that if ASSESS fails to produce
    // a structured plan (e.g., garbled JSON on large output → retry produces
    // simpler format), the planDraftProvider still has the best available plan.
    const planDraftRef: { current: string | null } = { current: null };

    // Seed planDraftRef from message history (last round's scratchpad)
    for (let i = previousMessages.length - 1; i >= 0; i--) {
      const msg = previousMessages[i];
      if (msg.role !== 'assistant' || !msg.parts) continue;
      for (const part of msg.parts as any[]) {
        if (part.toolName === 'updateAssessment' && part.output) {
          const output = typeof part.output === 'string'
            ? (() => { try { return JSON.parse(part.output); } catch { return null; } })()
            : part.output;
          // Unwrap AI SDK v6 envelope
          const value = output?.type === 'json' && output?.value !== undefined
            ? output.value
            : output;
          if (value?.planDraft && Array.isArray(value.planDraft.phases) && value.planDraft.phases.length > 0) {
            planDraftRef.current = JSON.stringify(value.planDraft);
            break;
          }
        }
      }
      if (planDraftRef.current) break;
    }
    if (planDraftRef.current) {
      console.log(`[workflow] Seeded planDraftRef from message history (${planDraftRef.current.length} chars)`);
    }

    // Create artifact tools per-request with the deferred proxy
    const artifactApiKey = getApiKey();
    const createDocument = createDocumentTool({
      dataStream: deferredDataStream,
      apiKey: artifactApiKey,
      userId: user.id,
      planDraftProvider: () => planDraftRef.current,
    });
    const updateDocument = updateDocumentTool({
      dataStream: deferredDataStream,
      apiKey: artifactApiKey,
      userId: user.id,
      planDraftProvider: () => planDraftRef.current,
    });
    const getDocument = getDocumentTool({
      userId: user.id,
    });

    // Merge static workflow tools + artifact tools
    const allTools = { ...staticTools, createDocument, updateDocument, getDocument };

    // Create the stateful agent with all tools.
    // onPersist captures ASSESS's planDraft into planDraftRef so that
    // createDocument/updateDocument can inject it automatically without
    // requiring the LLM to echo 50k+ of JSON.
    const agent = createStatefulAgent(workflow, allTools, {
      apiKey: artifactApiKey,
      onPersist: async (context) => {
        // Look for the best updateAssessment result containing a planDraft.
        // Prefer drafts with structured `phases` arrays over simpler formats
        // (e.g., weeksSummary) which can occur when a large structured attempt
        // fails and the model retries with a smaller payload.
        //
        // If no current-round draft has `phases`, preserve the seeded value
        // from the previous round (which did have phases).
        let bestDraft: any = null;
        let bestHasPhases = false;

        for (const tr of context.toolResults as any[]) {
          if (tr.toolName === 'updateAssessment' && tr.output?.planDraft) {
            const draft = tr.output.planDraft;
            const hasPhases = Array.isArray(draft.phases) && draft.phases.length > 0;

            // Always prefer a draft with phases over one without
            if (hasPhases && !bestHasPhases) {
              bestDraft = draft;
              bestHasPhases = true;
            } else if (hasPhases === bestHasPhases) {
              // Same quality — take the later one (more recent)
              bestDraft = draft;
            }
          }
        }

        if (bestDraft) {
          const newValue = JSON.stringify(bestDraft);
          // Only update if the new draft has phases, OR if there's no seeded value
          if (bestHasPhases || !planDraftRef.current) {
            planDraftRef.current = newValue;
          } else {
            // Current round produced a simpler format — check if seeded value had phases
            try {
              const seeded = JSON.parse(planDraftRef.current);
              if (Array.isArray(seeded.phases) && seeded.phases.length > 0) {
                // Keep the seeded value (it has phases, new one doesn't)
                console.log(`[workflow] Preserving seeded planDraft with phases over current round's simpler format`);
              } else {
                planDraftRef.current = newValue;
              }
            } catch {
              planDraftRef.current = newValue;
            }
          }
        }
      },
    });

    // Helper to merge tool results into assistant messages for DB persistence
    const mergeToolResultsIntoAssistantMessages = (messages: any[]): any[] => {
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
                input: parseIfString(item.input),
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
          chatId: workflowChat!.id,
          role: 'assistant' as const,
          parts,
        });
      }

      return mergedMessages;
    };

    // onFinish callback for message persistence
    const onFinish = async (messages: any[]) => {
      if (workflowChat && messages.length > 0) {
        const messagesToSave = mergeToolResultsIntoAssistantMessages(messages);
        if (messagesToSave.length > 0) {
          await saveMessages(messagesToSave);
        }
      }
    };

    try {
      // Use createUIMessageStream to get a writable stream for both
      // the agent's message stream AND artifact data writes.
      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          // Wire the deferred proxy to the real writer
          attachDataStream({
            write: (data) => writer.write(data as any),
          });

          // Get the agent's stream and merge it into the writer
          const agentStream = await agent.streamUI({
            messages: previousMessages.length > 0 ? previousMessages : undefined,
            prompt: previousMessages.length === 0 ? prompt : undefined,
            onFinish,
          });

          writer.merge(agentStream);
        },
        generateId: generateUUID,
        onError: (error) => {
          console.error('[workflow] Stream error:', error);
          return 'An error occurred during coaching.';
        },
      });

      return createUIMessageStreamResponse({
        stream,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'none',
        },
      });
    } catch (error: any) {
      console.error('[workflow] Stream error:', error?.message || error);
      console.error('[workflow] Error stack:', error?.stack);
      return Response.json({ error: error?.message || 'Workflow error' }, { status: 500 });
    }
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

      // Create artifact tools with dataStream context, API key, and userId
      const artifactApiKey = getApiKey();
      const createDocument = createDocumentTool({
        dataStream,
        apiKey: artifactApiKey,
        userId: user.id,
      });
      const updateDocument = updateDocumentTool({
        dataStream,
        apiKey: artifactApiKey,
        userId: user.id,
      });

      // Create getTodaySessions tool with userId for database queries
      const getTodaySessions = getTodaySessionsTool({
        userId: user.id,
      });

      // System prompt - Health Coach
      const regularPrompt = `You are a running coach. You know training, you know athletes, and you talk like a real person — not a chatbot.

Your primary role is to help users with their training:
- When users ask about their workouts, training, or schedule, use the getTodaySessions tool
- Provide advice on running form, recovery, nutrition, and training plans

CONVERSATION STYLE:
- Keep responses short — 2-3 sentences. React to what they say, then ask or advise.
- ONE question at a time. No bullet-point interrogations.
- Match their energy. If they're excited, match it. If they're frustrated, acknowledge it.
- No filler ("Great question!"). No corporate warmth. Just be direct and helpful.
- Talk like a coach in a conversation, not a manual.`;

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
- **getTodaySessions**: Get workout sessions for a specific date. Use this when users ask about their training, workouts, or schedule.
`;

      // Sanitize messages to remove orphaned tool calls
      // This prevents Anthropic API errors when tool_use lacks tool_result
      const sanitizedMessages = sanitizeMessages(uiMessages);

      // Convert UI messages to model format using AI SDK's built-in converter
      // This properly handles tool calls and results across messages
      const modelMessages = await convertToModelMessages(sanitizedMessages);

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
          getTodaySessions,
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
