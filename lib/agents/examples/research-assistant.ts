/**
 * Research Assistant - Example Workflow
 *
 * A simple 3-state workflow to test the stateful agent infrastructure.
 *
 * States:
 * - CLARIFY: Ask clarifying questions about the research topic
 * - SEARCH: Perform searches (simulated)
 * - ANSWER: Provide the final answer
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { WorkflowDefinition } from '../types';

// =============================================================================
// WORKFLOW DEFINITION
// =============================================================================

export type ResearchState = 'CLARIFY' | 'SEARCH' | 'ANSWER';

export const researchWorkflow: WorkflowDefinition<ResearchState> = {
  id: 'research-assistant',
  name: 'Research Assistant',
  description: 'A simple workflow that clarifies questions, searches, and provides answers',

  states: {
    CLARIFY: {
      name: 'Clarifying',
      description: 'Ask clarifying questions about the research topic',
      model: 'haiku', // Fast model for simple Q&A
      tools: ['askClarification', 'clarified'],
      instructions: `You are a research assistant. Your job is to understand what the user wants to know.

Ask 1-2 clarifying questions to better understand:
- What specific aspect they're interested in
- What level of detail they need
- Any constraints (time period, geography, etc.)

When you have enough context, call the 'clarified' tool to proceed.
If the question is already clear, you can call 'clarified' immediately.`,
    },

    SEARCH: {
      name: 'Researching',
      description: 'Search for relevant information',
      model: 'haiku',
      tools: ['search', 'searchComplete'],
      instructions: `You are a research assistant in the search phase.

Based on the clarified question, perform searches to gather information.
Use the 'search' tool to look up relevant information.
When you have gathered enough information, call 'searchComplete'.

Note: For this demo, searches return simulated results.`,
    },

    ANSWER: {
      name: 'Answering',
      description: 'Synthesize and provide the final answer',
      model: 'haiku', // Using haiku for testing (sonnet can be enabled for production)
      tools: ['provideAnswer'],
      toolChoice: 'required',
      instructions: `You are a research assistant ready to provide your answer.

Based on the search results, synthesize a comprehensive answer.
Call 'provideAnswer' with your response.

Be thorough but concise. Cite your sources where applicable.`,
    },
  },

  transitions: [
    // CLARIFY -> SEARCH (when clarification is done)
    {
      from: 'CLARIFY',
      to: 'SEARCH',
      trigger: { type: 'tool', toolName: 'clarified' },
    },
    // SEARCH -> ANSWER (when search is complete)
    {
      from: 'SEARCH',
      to: 'ANSWER',
      trigger: { type: 'tool', toolName: 'searchComplete' },
    },
  ],

  initialState: 'CLARIFY',
  terminalStates: ['ANSWER'],
  defaultModel: 'haiku',
  maxSteps: 20,
};

// =============================================================================
// TOOLS
// =============================================================================

/**
 * Tool to ask a clarifying question
 */
export const askClarification = tool({
  description: 'Ask the user a clarifying question about their research topic',
  inputSchema: z.object({
    question: z.string().describe('The clarifying question to ask'),
  }),
  execute: async ({ question }) => {
    // This tool just records the question - the actual asking happens in the response
    return { asked: question };
  },
});

/**
 * Tool to signal that clarification is complete
 */
export const clarified = tool({
  description: 'Signal that you have enough context to proceed with research',
  inputSchema: z.object({
    summary: z.string().describe('Summary of what the user wants to know'),
    constraints: z
      .array(z.string())
      .optional()
      .describe('Any constraints mentioned'),
  }),
  execute: async ({ summary, constraints }) => {
    return {
      clarified: true,
      summary,
      constraints: constraints || [],
    };
  },
});

/**
 * Tool to perform a search (simulated)
 */
export const search = tool({
  description: 'Search for information on a topic',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ query }) => {
    // Simulated search results
    return {
      query,
      results: [
        {
          title: `Information about: ${query}`,
          snippet: `This is a simulated search result for "${query}". In a real implementation, this would connect to a search API.`,
          source: 'simulated-source.com',
        },
        {
          title: `More on: ${query}`,
          snippet: `Additional simulated information about "${query}".`,
          source: 'another-source.com',
        },
      ],
    };
  },
});

/**
 * Tool to signal that search is complete
 */
export const searchComplete = tool({
  description: 'Signal that you have gathered enough information to answer',
  inputSchema: z.object({
    sourcesGathered: z.number().describe('Number of sources gathered'),
    readyToAnswer: z.boolean().describe('Whether ready to provide an answer'),
  }),
  execute: async ({ sourcesGathered, readyToAnswer }) => {
    return {
      searchComplete: true,
      sourcesGathered,
      readyToAnswer,
    };
  },
});

/**
 * Tool to provide the final answer
 */
export const provideAnswer = tool({
  description: 'Provide the final answer to the research question',
  inputSchema: z.object({
    answer: z.string().describe('The comprehensive answer'),
    confidence: z
      .enum(['high', 'medium', 'low'])
      .describe('Confidence level in the answer'),
    sources: z
      .array(z.string())
      .optional()
      .describe('Sources used for the answer'),
  }),
  execute: async ({ answer, confidence, sources }) => {
    // Terminal tool - returns the answer data
    return {
      completed: true,
      answer,
      confidence,
      sources: sources || [],
    };
  },
});

/**
 * All tools for the research workflow
 */
export const researchTools = {
  askClarification,
  clarified,
  search,
  searchComplete,
  provideAnswer,
};
