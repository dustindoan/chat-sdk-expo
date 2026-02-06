/**
 * Agent Chat API Endpoint (Streaming)
 *
 * Streaming endpoint for stateful agent workflows.
 * Returns workflow state in custom data parts for UI tracking.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
} from 'ai';
import { createStatefulAgent } from '../../lib/agents';
import {
  researchWorkflow,
  researchTools,
} from '../../lib/agents/examples/research-assistant';
import type { WorkflowContext } from '../../lib/agents/types';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, messages, workflowId } = body;

    if (!prompt && (!messages || messages.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt or messages' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For now, only support the research workflow
    // In the future, this could be dynamic based on workflowId
    const workflow = researchWorkflow;
    const tools = researchTools;

    // Create the stateful agent
    const agent = createStatefulAgent(workflow, tools, {
      apiKey: getApiKey(),
      onPersist: async (context: WorkflowContext) => {
        // Could save workflow state to DB here
        console.log('[agent-chat] State:', context.currentState);
      },
    });

    // Use the agent's stream method which returns a Response
    const response = await agent.stream({
      prompt,
      messages: messages?.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      onStateChange: (from, to, context) => {
        console.log(`[agent-chat] Transition: ${from} -> ${to}`);
      },
    });

    return response;
  } catch (error) {
    console.error('Agent chat error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
