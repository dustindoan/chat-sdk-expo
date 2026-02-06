/**
 * Agent Test API Endpoint
 *
 * Tests the stateful agent infrastructure with the research assistant workflow.
 * This is a non-streaming endpoint that returns the full result as JSON.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createStatefulAgent } from '../../lib/agents';
import {
  researchWorkflow,
  researchTools,
} from '../../lib/agents/examples/research-assistant';

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
    const { prompt, messages } = body;

    if (!prompt && (!messages || messages.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt or messages' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create the stateful agent
    const agent = createStatefulAgent(researchWorkflow, researchTools, {
      apiKey: getApiKey(),
    });

    // Generate response
    const result = await agent.generate({
      prompt,
      messages: messages?.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Return the result
    return new Response(
      JSON.stringify({
        text: result.text,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults.map((tr) => ({
          toolName: tr.toolName,
          args: 'args' in tr ? tr.args : undefined,
          result: 'result' in tr ? tr.result : undefined,
        })),
        context: {
          currentState: result.context.currentState,
          stateHistory: result.context.stateHistory,
          stepNumber: result.context.stepNumber,
        },
        isComplete: result.isComplete,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Agent test error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
