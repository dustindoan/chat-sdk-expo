/**
 * Coaching Workflow - Health Coach
 *
 * An EXTRACT → ASSESS → RESPOND loop for personalized training plan creation.
 *
 * Architecture:
 * Each user message triggers a 3-step loop (all within one ToolLoopAgent round):
 *   1. EXTRACT (silent) — pull structured data from conversation into working memory
 *   2. ASSESS  (silent) — analyze gaps, flag safety, determine what's missing
 *   3. RESPOND (conversational) — say one thing, ask one thing
 *
 * When enough data is gathered, RESPOND exits the loop into:
 *   4. PLAN    — generate training plan
 *   5. PRESENT — present plan for review/refinement
 *
 * Key Principle: States serve the understanding process, not the conversation flow.
 * Information arrives whenever the user gives it. The machine keeps up.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { WorkflowDefinition, WorkflowContext, ToolResult } from '../types';
import type { UIMessage } from 'ai';

// =============================================================================
// WORKING MEMORY
// =============================================================================

export interface SafetyFlag {
  flag: string;
  acknowledged: boolean;
}

export interface CoachingMemory {
  goal?: { event: string; target: string; raw: string };
  currentFitness?: {
    times: Record<string, string>;
    weeklyVolume?: string;
    raw: string;
  };
  motivation?: string;
  athleteBackground?: string;
  constraints?: {
    injuries: string[];
    schedule: string;
    age?: number;
  };
  safetyFlags: SafetyFlag[];
  readyToPlan: boolean;
}

const EMPTY_MEMORY: CoachingMemory = {
  safetyFlags: [],
  readyToPlan: false,
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get the latest CoachingMemory from the current round's tool results.
 */
function getMemoryFromToolResults(toolResults: ToolResult[]): CoachingMemory {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    if (toolResults[i].toolName === 'updateMemory') {
      const output = toolResults[i].output as Record<string, unknown> | undefined;
      if (output?.memory) {
        return output.memory as CoachingMemory;
      }
    }
  }
  return { ...EMPTY_MEMORY };
}

/**
 * Get the latest CoachingMemory from previous rounds' message history.
 * Scans backward through messages for the most recent updateMemory tool result.
 */
function getMemoryFromMessages(messages: UIMessage[]): CoachingMemory {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || !msg.parts) continue;
    for (const part of msg.parts as any[]) {
      // Check both the toolName field and the type prefix
      const name = part.toolName || part.type?.replace('tool-', '');
      if (name === 'updateMemory') {
        const output = part.output || part.result;
        if (output?.memory) {
          return output.memory as CoachingMemory;
        }
      }
    }
  }
  return { ...EMPTY_MEMORY };
}

/**
 * Get the latest assessment from the current round's tool results.
 */
function getAssessmentFromToolResults(
  toolResults: ToolResult[]
): { gapAnalysis?: string; missingData: string[]; safetyFlags: string[]; notes: string } | null {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    if (toolResults[i].toolName === 'updateAssessment') {
      return toolResults[i].output as any;
    }
  }
  return null;
}

/**
 * Check if a plan has already been generated in message history.
 */
function hasPlanInHistory(messages: UIMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || !msg.parts) continue;
    for (const part of msg.parts as any[]) {
      const name = part.toolName || part.type?.replace('tool-', '');
      if (name === 'generatePlan') return true;
    }
  }
  return false;
}

/**
 * Deterministic coordinator: pick response directive based on memory gaps.
 * This is NOT an LLM call — it's a simple function that drives what RESPOND says.
 */
function getResponseDirective(memory: CoachingMemory, planExists: boolean): string {
  // Post-plan mode: handle refinement
  if (planExists) {
    return `A training plan has already been generated. Handle the athlete's feedback about the plan. If they want changes, use refinePlan. If they're satisfied, use acceptPlan. Otherwise just answer their question about the plan.`;
  }

  // Pre-plan: work through what's missing. Do not call any tools.
  const noTools = 'Do not call any tools.';

  if (!memory.goal) {
    return `The athlete hasn't shared their goal yet. Ask what they're working toward. Be a coach meeting someone for the first time. ${noTools}`;
  }
  if (!memory.currentFitness) {
    return `The athlete wants: "${memory.goal.raw}". You don't know where they are now. Ask about their current level — recent times, how much they're running. ${noTools}`;
  }
  if (!memory.motivation) {
    return `You know their goal and current fitness. Ask why this goal matters to them — what's the story behind it? ${noTools}`;
  }
  if (!memory.constraints?.schedule) {
    return `You have their goal, fitness, and motivation. Ask about training availability — how many days a week they can train. ${noTools}`;
  }

  // Unacknowledged safety flags need to be addressed once, then folded into context
  const unacknowledged = memory.safetyFlags.filter(f => !f.acknowledged);
  if (unacknowledged.length > 0 && !memory.readyToPlan) {
    return `There are safety considerations: ${unacknowledged.map(f => f.flag).join('; ')}. Acknowledge these as a caring coach — tell them how you'll account for it in the plan. Then ask about the next missing piece. ${noTools}`;
  }

  // Ready to plan — safety flags (acknowledged or not) inform the plan, they don't block it
  if (memory.readyToPlan) {
    const safetyNote = memory.safetyFlags.length > 0
      ? ` The plan must account for: ${memory.safetyFlags.map(f => f.flag).join('; ')}.`
      : '';
    return `You have everything needed. Briefly summarize what you know about this athlete, then call beginPlan to start building their training plan.${safetyNote}`;
  }

  // Fallback: check for missing optional fields
  const missing: string[] = [];
  if (!memory.constraints?.age) missing.push('age');
  if (!memory.athleteBackground) missing.push('running background');
  if (missing.length > 0) {
    return `Almost ready to build the plan. Ask about: ${missing[0]}. ${noTools}`;
  }

  return `Continue the conversation naturally. Ask if they have any other details before you build the plan. ${noTools}`;
}

// =============================================================================
// WORKFLOW DEFINITION
// =============================================================================

export type CoachingState =
  | 'EXTRACT'
  | 'ASSESS'
  | 'RESPOND'
  | 'PLAN'
  | 'PRESENT';

export const coachingWorkflow: WorkflowDefinition<CoachingState> = {
  id: 'coaching',
  name: 'Fitness Coaching',
  description:
    'Personalized training plan creation through conversational coaching with structured understanding',

  states: {
    // =========================================================================
    // EXTRACT — Silent. Pull structured data from the latest conversation.
    // =========================================================================
    EXTRACT: {
      name: 'Understanding',
      description: 'Extract structured data from the conversation into working memory',
      model: 'haiku',
      tools: ['updateMemory'],
      toolChoice: 'required',
      hidden: true,
      instructions: (context: WorkflowContext) => {
        const previousMemory = getMemoryFromMessages(context.messages);
        return `Extract structured data from the conversation into the coaching memory. Return the COMPLETE updated memory.

Previous memory:
${JSON.stringify(previousMemory, null, 2)}

Rules:
- Only extract what was EXPLICITLY stated. Do not infer or assume.
- Carry forward all previous values unchanged unless the user corrected something.
- If the user gave new information, add it to the appropriate field.
- safetyFlags are objects with {flag, acknowledged}. Set acknowledged: true when the coach has already addressed this concern in a previous response. New flags start as acknowledged: false.
- Set readyToPlan to true ONLY when ALL of these are present: goal, currentFitness, motivation, AND constraints.schedule.

Call updateMemory with the complete updated memory.`;
      },
    },

    // =========================================================================
    // ASSESS — Silent. Analyze the memory, compute gaps, flag safety.
    // =========================================================================
    ASSESS: {
      name: 'Analyzing',
      description: 'Analyze memory state, compute gaps, flag safety concerns',
      model: 'haiku',
      tools: ['updateAssessment'],
      toolChoice: 'required',
      hidden: true,
      instructions: (context: WorkflowContext) => {
        const memory = getMemoryFromToolResults(context.toolResults);
        return `Analyze this athlete's data. Compute gaps and flag safety concerns.

Memory:
${JSON.stringify(memory, null, 2)}

Rules:
- If goal and currentFitness both exist, compute the gap precisely. Example: goal is 4:20, current is 4:47, gap is "27 seconds to drop" (NOT "dropped 27 seconds").
- Flag safety concerns: age + high intensity, injury history, unrealistic timelines.
- List what data is still missing for a training plan.
- Be precise with direction: the gap is what they NEED TO CLOSE, not what they've achieved.

Call updateAssessment with your analysis.`;
      },
    },

    // =========================================================================
    // RESPOND — Conversational. Say one thing, ask one thing.
    // =========================================================================
    RESPOND: {
      name: 'Coaching',
      description: 'Generate one conversational coaching response',
      model: 'haiku',
      tools: ['beginPlan', 'refinePlan', 'acceptPlan'],
      instructions: (context: WorkflowContext) => {
        const memory = getMemoryFromToolResults(context.toolResults);
        const assessment = getAssessmentFromToolResults(context.toolResults);
        const planExists = hasPlanInHistory(context.messages);
        const directive = getResponseDirective(memory, planExists);

        return `You are a running coach in conversation. ${directive}

${assessment?.notes ? `Internal notes (do NOT share directly, use to inform your response): ${assessment.notes}` : ''}

Style:
- 2-3 sentences max. React to what they said, then ask or advise.
- ONE question at a time. No lists.
- Talk like a person, not a manual.`;
      },
    },

    // =========================================================================
    // PLAN — Generate training plan from accumulated memory.
    // =========================================================================
    PLAN: {
      name: 'Building Your Plan',
      description: 'Generate personalized training plan',
      model: 'haiku',
      tools: ['generatePlan'],
      toolChoice: 'required',
      instructions: (context: WorkflowContext) => {
        const memory = getMemoryFromToolResults(context.toolResults)
          || getMemoryFromMessages(context.messages);
        const assessment = getAssessmentFromToolResults(context.toolResults);

        return `Create a personalized training plan for this athlete.

Athlete:
${JSON.stringify(memory, null, 2)}

${assessment ? `Analysis: ${assessment.notes}` : ''}
${assessment?.gapAnalysis ? `Gap: ${assessment.gapAnalysis}` : ''}
${memory.safetyFlags.length > 0 ? `Safety flags: ${memory.safetyFlags.map(f => f.flag).join(', ')}` : ''}

Plan requirements:
1. Respect current fitness level and available time
2. No more than 10% weekly volume increase
3. Account for any safety flags
4. Mix of workout types (easy, tempo, intervals, long run)
5. 1-2 rest days per week

Call generatePlan with the complete training plan.`;
      },
    },

    // =========================================================================
    // PRESENT — Present plan, handle refinement.
    // =========================================================================
    PRESENT: {
      name: 'Your Plan',
      description: 'Present plan for review and refinement',
      model: 'haiku',
      tools: ['refinePlan', 'acceptPlan'],
      instructions: `You are the coach presenting the training plan.

Your job:
1. Briefly summarize the plan structure and key workouts
2. Explain reasoning behind important decisions
3. If they request changes, use refinePlan
4. If they're happy, use acceptPlan

Be encouraging — they're about to start their training journey.`,
    },
  },

  transitions: [
    // Loop: EXTRACT → ASSESS → RESPOND
    {
      from: 'EXTRACT',
      to: 'ASSESS',
      trigger: { type: 'tool', toolName: 'updateMemory' },
    },
    {
      from: 'ASSESS',
      to: 'RESPOND',
      trigger: { type: 'tool', toolName: 'updateAssessment' },
    },
    // Loop exit: RESPOND → PLAN (when readyToPlan)
    {
      from: 'RESPOND',
      to: 'PLAN',
      trigger: { type: 'tool', toolName: 'beginPlan' },
    },
    // Plan generation → presentation
    {
      from: 'PLAN',
      to: 'PRESENT',
      trigger: { type: 'tool', toolName: 'generatePlan' },
    },
    // Post-plan refinement from RESPOND (after loop processes refinement message)
    {
      from: 'RESPOND',
      to: 'PLAN',
      trigger: { type: 'tool', toolName: 'refinePlan' },
    },
    // Refinement from PRESENT
    {
      from: 'PRESENT',
      to: 'PLAN',
      trigger: { type: 'tool', toolName: 'refinePlan' },
    },
  ],

  initialState: 'EXTRACT',
  terminalStates: ['PRESENT'],
  defaultModel: 'haiku',
  maxSteps: 30,
};

// =============================================================================
// TOOLS
// =============================================================================

/**
 * EXTRACT: Update the coaching working memory with extracted data.
 */
export const updateMemory = tool({
  description:
    'Update the coaching working memory with structured data extracted from the conversation',
  inputSchema: z.object({
    goal: z
      .object({
        event: z.string().describe('The event, e.g. "1500m", "marathon"'),
        target: z.string().describe('The target, e.g. "4:20", "sub-3"'),
        raw: z.string().describe('The user\'s original words about their goal'),
      })
      .optional()
      .describe('Athletic goal if stated'),
    currentFitness: z
      .object({
        times: z
          .record(z.string(), z.string())
          .describe('Event -> time mappings, e.g. {"1500m": "4:47", "5K": "19:49"}'),
        weeklyVolume: z.string().optional().describe('Weekly training volume if stated'),
        raw: z.string().describe('The user\'s original words about current fitness'),
      })
      .optional()
      .describe('Current fitness data if stated'),
    motivation: z
      .string()
      .optional()
      .describe('Why this goal matters to them'),
    athleteBackground: z
      .string()
      .optional()
      .describe('Running or athletic history'),
    constraints: z
      .object({
        injuries: z.array(z.string()).default([]).describe('Current or past injuries'),
        schedule: z.string().describe('Training availability, e.g. "5 days/week"'),
        age: z.number().optional().describe('Age if stated'),
      })
      .optional()
      .describe('Physical and schedule constraints'),
    safetyFlags: z
      .array(z.object({
        flag: z.string().describe('The safety concern'),
        acknowledged: z.boolean().describe('True if the coach already addressed this in a previous response'),
      }))
      .default([])
      .describe('Safety concerns with tracking of whether the coach has addressed them'),
    readyToPlan: z
      .boolean()
      .describe(
        'True ONLY when goal, currentFitness, motivation, AND constraints.schedule are ALL present'
      ),
  }),
  execute: async (params) => {
    const memory: CoachingMemory = {
      goal: params.goal,
      currentFitness: params.currentFitness,
      motivation: params.motivation,
      athleteBackground: params.athleteBackground,
      constraints: params.constraints,
      safetyFlags: params.safetyFlags || [],
      readyToPlan: params.readyToPlan,
    };
    return { memory, timestamp: new Date().toISOString() };
  },
});

/**
 * ASSESS: Record gap analysis and safety assessment.
 */
export const updateAssessment = tool({
  description: 'Record gap analysis, safety assessment, and missing data analysis',
  inputSchema: z.object({
    gapAnalysis: z
      .string()
      .optional()
      .describe(
        'The specific gap between current and goal, e.g. "needs to drop 27 seconds from 4:47 to 4:20"'
      ),
    missingData: z
      .array(z.string())
      .describe('Data points still needed before planning'),
    safetyFlags: z
      .array(z.string())
      .describe('Safety concerns to shape the plan around'),
    notes: z
      .string()
      .describe('Internal coaching notes — context for RESPOND, not shared with athlete'),
  }),
  execute: async (params) => {
    return {
      gapAnalysis: params.gapAnalysis,
      missingData: params.missingData,
      safetyFlags: params.safetyFlags,
      notes: params.notes,
    };
  },
});

/**
 * RESPOND: Transition from conversation to plan generation.
 */
export const beginPlan = tool({
  description:
    'Transition to plan generation when all required data has been gathered',
  inputSchema: z.object({
    athleteSummary: z
      .string()
      .describe('Brief summary of the athlete for plan generation'),
    planConstraints: z
      .array(z.string())
      .describe('Constraints the plan must respect'),
  }),
  execute: async (params) => {
    return {
      transitionToPlan: true,
      athleteSummary: params.athleteSummary,
      planConstraints: params.planConstraints,
    };
  },
});

/**
 * PLAN: Generate the training plan.
 */
export const generatePlan = tool({
  description: 'Generate a personalized training plan',
  inputSchema: z.object({
    name: z.string().describe('Name of the training plan'),
    goal: z.string().describe('The goal this plan achieves'),
    startDate: z.string().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().describe('End date (YYYY-MM-DD)'),
    weeklyStructure: z.string().describe('Overview of weekly structure'),
    weeks: z.array(
      z.object({
        weekNumber: z.number(),
        focus: z.string().optional(),
        totalVolume: z.string().optional(),
        keyWorkouts: z.array(z.string()),
        notes: z.string().optional(),
      })
    ),
    summary: z
      .string()
      .describe('Brief summary of the plan philosophy'),
  }),
  execute: async (params) => {
    return {
      planGenerated: true,
      plan: params,
    };
  },
});

/**
 * PRESENT/RESPOND: Refine the plan based on feedback.
 */
export const refinePlan = tool({
  description: 'Modify the training plan based on user feedback',
  inputSchema: z.object({
    modification: z.string().describe('What change the user requested'),
    affectedWeeks: z
      .array(z.number())
      .optional()
      .describe('Which weeks are affected'),
    reason: z.string().optional().describe('Reason for the change'),
  }),
  execute: async (params) => {
    return {
      refinementRequested: true,
      modification: params.modification,
    };
  },
});

/**
 * PRESENT/RESPOND: User accepts the plan.
 */
export const acceptPlan = tool({
  description: 'User accepts the training plan',
  inputSchema: z.object({
    confirmed: z
      .boolean()
      .describe('Whether the user confirmed acceptance'),
    feedback: z.string().optional().describe('Any final feedback'),
  }),
  execute: async (params) => {
    return {
      planAccepted: params.confirmed,
      feedback: params.feedback,
    };
  },
});

/**
 * All tools for the coaching workflow
 */
export const coachingTools = {
  updateMemory,
  updateAssessment,
  beginPlan,
  generatePlan,
  refinePlan,
  acceptPlan,
};
