/**
 * Coaching Workflow - Health Coach
 *
 * Three-Layer Cognitive Architecture:
 *   1. Memory (semantic)    — stable athlete facts. EXTRACT's domain.
 *   2. Scratchpad (working) — evolving plan draft + reasoning. ASSESS's domain.
 *   3. Artifact (rendered)  — clean plan shown to athlete. Projection of scratchpad.
 *
 * Each user message triggers a 3-step loop (all within one ToolLoopAgent round):
 *   1. EXTRACT (silent) — pull structured data from conversation into memory
 *   2. ASSESS  (silent) — reason about the plan, build scratchpad, discover tensions
 *   3. RESPOND (conversational) — say one thing, ask one thing, or render artifact
 *
 * The coordinator is domain-free. It reads only ASSESS's signals (draftReady,
 * draftChanged, notes, directRequest) and document state. All domain reasoning
 * flows through ASSESS's output — the coordinator doesn't inspect memory fields
 * or scratchpad schema internals.
 *
 * References:
 * - CoALA (Sumers et al., 2024) — semantic/working/procedural memory taxonomy
 * - MemGPT (Packer et al., 2023) — hierarchical memory with scratchpad
 * - RAISE (Liu et al., 2024) — dual-component memory for conversational agents
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { WorkflowDefinition, WorkflowContext, ToolResult } from '../types';
import type { UIMessage } from 'ai';
import { trainingBlockSchema } from '../../artifacts/handlers/training-block';

// =============================================================================
// LAYER 1: MEMORY — Stable athlete facts (EXTRACT's domain)
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
}

const EMPTY_MEMORY: CoachingMemory = {
  safetyFlags: [],
};

// =============================================================================
// LAYER 2: SCRATCHPAD — Evolving plan workspace (ASSESS's domain)
// =============================================================================

/**
 * The scratchpad lives in updateAssessment's output.
 * ASSESS reads the previous scratchpad and outputs the updated version.
 * The planDraft field uses the training block schema's deep partial —
 * the agent thinks in the same vocabulary as the rendered artifact.
 */
export interface PlanWorkspace {
  planDraft?: Record<string, unknown>; // DeepPartial<TrainingBlock> at runtime
  reasoning?: string;
  tensions?: string[];
  missingData?: string[];
}

// =============================================================================
// ASSESSMENT — ASSESS's full output (scratchpad + coordinator signals + analysis)
// =============================================================================

export interface Assessment {
  // Coordinator signals (domain-free)
  draftReady: boolean;
  draftChanged: boolean;
  notes: string;
  directRequest?: string;
  // Analysis
  gapAnalysis?: string;
  missingData: string[];
  safetyFlags: string[];
  // Scratchpad
  planDraft?: Record<string, unknown>;
  reasoning?: string;
  tensions?: string[];
}

// =============================================================================
// HELPERS — Message history scanners
// =============================================================================

/**
 * Generic backward scanner: find the most recent tool output by name in message history.
 */
function getToolOutputFromMessages(
  toolName: string,
  messages: UIMessage[],
): Record<string, unknown> | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || !msg.parts) continue;
    for (const part of msg.parts as any[]) {
      const name = part.toolName || part.type?.replace('tool-', '');
      if (name === toolName) {
        return unwrapOutput(part.output || part.result) as Record<string, unknown> | null;
      }
    }
  }
  return null;
}

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
 */
function getMemoryFromMessages(messages: UIMessage[]): CoachingMemory {
  const output = getToolOutputFromMessages('updateMemory', messages);
  if (output?.memory) {
    return output.memory as CoachingMemory;
  }
  return { ...EMPTY_MEMORY };
}

/**
 * Get the latest assessment from the current round's tool results.
 */
function getAssessmentFromToolResults(toolResults: ToolResult[]): Assessment | null {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    if (toolResults[i].toolName === 'updateAssessment') {
      return toolResults[i].output as unknown as Assessment;
    }
  }
  return null;
}

/**
 * Get the previous scratchpad from message history.
 * Scans backward for the most recent updateAssessment with scratchpad data.
 */
function getScratchpadFromMessages(messages: UIMessage[]): PlanWorkspace {
  const output = getToolOutputFromMessages('updateAssessment', messages);
  if (!output) return {};

  return {
    planDraft: output.planDraft as Record<string, unknown> | undefined,
    reasoning: output.reasoning as string | undefined,
    tensions: output.tensions as string[] | undefined,
    missingData: output.missingData as string[] | undefined,
  };
}

/**
 * Check if a training-block artifact has been created in message history.
 */
function hasDraftInHistory(messages: UIMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || !msg.parts) continue;
    for (const part of msg.parts as any[]) {
      const name = part.toolName || part.type?.replace('tool-', '');
      if (name === 'createDocument') return true;
    }
  }
  return false;
}

/**
 * Unwrap AI SDK v6 result envelope: {type:"json", value: {...}} → the inner value.
 * Also handles direct objects (no envelope) for tool results within the agent loop.
 */
function unwrapOutput(output: any): any {
  if (!output) return output;
  // AI SDK v6 envelope: { type: "json", value: { ... } }
  if (output.type === 'json' && output.value !== undefined) {
    return output.value;
  }
  return output;
}

/**
 * Get the document ID from the current round's tool results (for within-round awareness).
 */
function getDocumentIdFromToolResults(toolResults: ToolResult[]): string | null {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const tr = toolResults[i] as any;
    if (tr.toolName === 'createDocument' || tr.toolName === 'updateDocument') {
      const output = unwrapOutput(tr.output);
      if (output?.id) return output.id;
    }
  }
  return null;
}

/**
 * Get the document ID from the most recent createDocument or updateDocument call.
 */
function getDocumentIdFromHistory(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || !msg.parts) continue;
    for (const part of msg.parts as any[]) {
      const name = part.toolName || part.type?.replace('tool-', '');
      if (name === 'createDocument' || name === 'updateDocument') {
        const output = unwrapOutput(part.output || part.result);
        if (output?.id) return output.id;
      }
    }
  }
  return null;
}

// =============================================================================
// COORDINATOR — Domain-free routing layer
// =============================================================================

/**
 * Deterministic coordinator: pick response directive based on ASSESS signals.
 *
 * Domain-free: reads only coordinator signals (draftReady, draftChanged, notes,
 * directRequest) and document state (draftExists, documentId). Does NOT inspect
 * memory fields or scratchpad schema internals.
 *
 * The coordinator is pattern-level, not domain-level. It could work unchanged
 * for a meal planner, career coach, or curriculum designer.
 */
function getResponseDirective(
  draftExists: boolean,
  documentId: string | null,
  assessment: Assessment | null,
  docActionTaken: boolean,
): string {
  // Direct request (non-coaching topic) — always takes priority
  if (assessment?.directRequest) {
    return assessment.directRequest;
  }

  // Build a composed directive. Tool actions and conversation are not mutually exclusive.
  const parts: string[] = [];

  // Artifact action — phrased as a hard requirement so the model doesn't skip it.
  // Note: the content parameter is injected automatically by the system from
  // ASSESS's planDraft. The LLM only needs to provide title/kind (create) or
  // id/description (update) — no need to echo the full plan JSON.
  // Skip if a doc action was already taken this round (prevent create→update chain).
  if (!docActionTaken && assessment?.draftReady && !draftExists) {
    parts.push(
      `REQUIRED ACTION: You MUST call createDocument with kind "training-block" and a descriptive title. The plan content is handled automatically — do NOT pass a "content" parameter. The plan is a living draft — generating it early lets the athlete see and react to it. Do this FIRST, then continue the conversation.`,
    );
  } else if (!docActionTaken && assessment?.draftChanged && draftExists && documentId) {
    parts.push(
      `REQUIRED ACTION: You MUST call updateDocument with id "${documentId}" and a description of what changed. The updated plan content is handled automatically — do NOT pass a "content" parameter. Do this FIRST, then continue the conversation.`,
    );
  }

  // Conversational guidance from ASSESS — always threaded through
  if (assessment?.notes) {
    parts.push(`After the tool call (if any), say this to the athlete: ${assessment.notes}`);
  } else if (documentId) {
    parts.push(
      `Answer questions, provide coaching advice. If they want plan changes, call updateDocument with id "${documentId}".`,
    );
  } else if (parts.length === 0) {
    parts.push('Continue the conversation naturally.');
  }

  // If no tool actions needed (or already taken), suppress tool calls
  const hasToolAction = !docActionTaken && (
    (assessment?.draftReady && !draftExists) ||
    (assessment?.draftChanged && draftExists && documentId)
  );
  if (!hasToolAction) {
    parts.push('Do not call any tools.');
  }

  return parts.join(' ');
}

// =============================================================================
// WORKFLOW DEFINITION
// =============================================================================

export type CoachingState =
  | 'EXTRACT'
  | 'ASSESS'
  | 'RESPOND';

export const coachingWorkflow: WorkflowDefinition<CoachingState> = {
  id: 'coaching',
  name: 'Fitness Coaching',
  description:
    'Three-layer cognitive architecture: memory (athlete facts), scratchpad (plan reasoning), artifact (rendered plan)',

  states: {
    // =========================================================================
    // EXTRACT — Silent. Pull structured data into memory.
    // Only handles athlete facts. No scratchpad awareness.
    // =========================================================================
    EXTRACT: {
      name: 'Understanding',
      description: 'Extract structured athlete data from the conversation into memory',
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

Call updateMemory with the complete updated memory.`;
      },
    },

    // =========================================================================
    // ASSESS — Silent. Reason about the plan. Build scratchpad.
    // Receives memory + previous scratchpad. Outputs updated scratchpad +
    // coordinator signals + analysis.
    // =========================================================================
    ASSESS: {
      name: 'Analyzing',
      description: 'Analyze memory, build plan draft in scratchpad, discover tensions',
      model: 'haiku',
      tools: ['updateAssessment'],
      toolChoice: 'required',
      hidden: true,
      instructions: (context: WorkflowContext) => {
        const memory = getMemoryFromToolResults(context.toolResults);
        const scratchpad = getScratchpadFromMessages(context.messages);
        return `You are a running coach's analytical mind. You have two inputs: the athlete's profile (memory) and your planning workspace (scratchpad). Your job: analyze the athlete data, build or refine the training plan draft, and decide what to ask or say next.

MEMORY (stable athlete facts):
${JSON.stringify(memory, null, 2)}

SCRATCHPAD (your previous planning workspace):
${JSON.stringify(scratchpad, null, 2)}

## Your Two Jobs:

### 1. Build/Refine the planDraft
Think in the training block schema. Build the plan incrementally as understanding deepens:

**LEVEL 1** (Goal + fitness known): Start with athleteProfile, totalWeeks, phase names/focus/duration
**LEVEL 2** (Schedule + constraints known): Add weeklyVolume ranges, qualitySessions summaries
**LEVEL 3** (Paces calibrated OR 3+ rounds of data): Populate STRUCTURED weeks with days and sessions

CRITICAL: Once you have the athlete's schedule (which days), paces or recent race times, and injury constraints, you MUST populate each phase's \`weeks\` array with actual week objects containing \`days\` and \`sessions\`. Do NOT stay at prose descriptions — the renderer needs structured data.

Each session in the \`sessions\` array must have: \`id\` (unique string like "w1-tue-1"), \`type\` ("run"|"strength"|"rest"|"cross-training"), \`title\` (e.g., "Easy Run"), and optionally: \`category\` ("easy"|"tempo"|"interval"|"long"|"recovery"|"race-pace"|"fartlek"), \`distance\`, \`duration\`, \`intensity\` ({target, zone?, rpe?}), \`intervals\` ({reps, distance, pace, recovery}), \`warmup\`, \`cooldown\`, \`description\`.

When updating planDraft, include the COMPLETE current draft (carry forward unchanged parts).
The planDraft schema (all fields optional for incremental building):
{
  name: string,
  athleteProfile: { currentLevel, goalEvent, gap, constraints?, notes? },
  totalWeeks: number,
  phases: [{
    name, focus, durationWeeks,
    weeklyVolume: { start, end, progression },
    qualitySessions: { perWeek, types },
    weeks: [{
      weekNumber, targetVolume, focus?,
      days: [{
        dayOfWeek: "monday"|"tuesday"|...|"sunday",
        sessions: [{ id, type, category?, title, distance?, duration?, intensity?, intervals?, warmup?, cooldown?, description? }]
      }]
    }]
  }]
}

IMPORTANT: When populating weeks, you don't need to generate ALL weeks immediately. Start with weeks 1-2 of each phase as representative examples, then fill in more detail in subsequent rounds. But DO use the structured format — not prose descriptions.

### 2. Maintain the missingData List
Your scratchpad carries forward a missingData list from last round. Manage it:
- **Cross off** items the athlete just answered
- **Keep** items that are still unanswered
- **Add new items** as the plan reveals assumptions that haven't been confirmed

Look for what the plan assumes but hasn't verified:
- Structural: schedule conflicts, pace/fitness gaps, volume vs injury risk, recovery gaps
- Training history: has the athlete done this type of work before? How recently? What went well or badly?
- Auxiliary: strength training, core work, mobility (critical for injury prevention and 1500m power)
- Recovery: sleep, stress, nutrition — these constrain adaptation rate
- Race context: race experience, heat structure, pacing strategy, gear (spikes?)
- Context of previous times: peak-fitness race or rust-buster? Solo or paced? This affects the real gap
- Age and life stage: recovery capacity, training response, injury risk all vary with age

The missingData list is your curiosity. It should only shrink when the athlete gives you answers, never because you got distracted by other information.

### 3. Pick the Next Question
From missingData, pick the ONE item that would most change the plan if the answer were surprising. Put it in 'notes'. This drives the conversation.

## Coordinator Signals (IMPORTANT):
- Set draftReady to true when planDraft has phase structure (names, focus, duration estimates). This is a LOW bar — generate early, refine as answers come in.
- Set draftChanged to true when you modified planDraft this round
- ALWAYS put something in notes — the next question, a coaching insight, or a specific plan element to discuss

## Analysis:
- Compute the gap precisely if goal + fitness are known (e.g., "27 seconds to drop")
- Flag safety concerns: age + intensity, injury history, unrealistic timelines
- If the user's message is NOT about coaching (e.g., "compare running shoes"), set directRequest

Call updateAssessment with your complete output.`;
      },
    },

    // =========================================================================
    // RESPOND — Conversational. Driven entirely by coordinator directive.
    // =========================================================================
    RESPOND: {
      name: 'Coaching',
      description: 'Generate one conversational coaching response',
      model: 'haiku',
      // createDocument, updateDocument, and getDocument are injected per-request
      // in chat+api.ts. They don't trigger state transitions — they're side
      // effects within RESPOND.
      tools: ['createDocument', 'updateDocument', 'getDocument'],
      // Dynamic toolChoice: force 'required' when the coordinator needs a
      // document action (create or update) AND the action hasn't been taken
      // yet in this round. Otherwise 'auto' so the model can respond
      // conversationally without calling tools.
      toolChoice: (context: WorkflowContext) => {
        // Check if createDocument/updateDocument was already called in this round
        const docActionTaken = context.toolResults.some(
          (tr: any) => tr.toolName === 'createDocument' || tr.toolName === 'updateDocument'
        );
        if (docActionTaken) return 'auto';

        const assessment = getAssessmentFromToolResults(context.toolResults);
        const draftExists = hasDraftInHistory(context.messages);
        const documentId = getDocumentIdFromHistory(context.messages);
        const needsToolCall =
          (assessment?.draftReady && !draftExists) ||
          (assessment?.draftChanged && draftExists && !!documentId);
        return needsToolCall ? 'required' : 'auto';
      },
      instructions: (context: WorkflowContext) => {
        const assessment = getAssessmentFromToolResults(context.toolResults);

        // Check both message history AND current round's tool results for doc state
        const docActionInRound = context.toolResults.some(
          (tr: any) => tr.toolName === 'createDocument' || tr.toolName === 'updateDocument'
        );
        const draftExists = docActionInRound || hasDraftInHistory(context.messages);
        const documentId = getDocumentIdFromToolResults(context.toolResults)
          || getDocumentIdFromHistory(context.messages);
        const directive = getResponseDirective(draftExists, documentId, assessment, docActionInRound);

        return `You are a running coach in conversation. ${directive}

${assessment?.missingData?.length ? `Still need to learn: ${assessment.missingData.join(', ')}` : ''}
${assessment?.tensions?.length ? `Tensions to explore: ${assessment.tensions.join('; ')}` : ''}

Style:
- 2-3 sentences max. React to what they said, then ask or advise.
- ONE question at a time. No lists.
- Talk like a person, not a manual.`;
      },
    },
  },

  transitions: [
    // The loop: EXTRACT → ASSESS → RESPOND
    // createDocument/updateDocument do NOT trigger transitions — they're
    // side effects within RESPOND. The loop resets to EXTRACT on each new
    // user message (deriveState sees no tool results at round start).
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
  ],

  initialState: 'EXTRACT',
  terminalStates: ['RESPOND'],
  defaultModel: 'haiku',
  maxSteps: 30,
};

// =============================================================================
// TOOLS (static — no dataStream dependency)
// =============================================================================

/**
 * EXTRACT: Update the coaching memory with extracted athlete data.
 * Memory = stable athlete facts only. No scratchpad, no plan draft.
 */
export const updateMemory = tool({
  description:
    'Update the coaching memory with structured athlete data extracted from the conversation',
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
  }),
  execute: async (params) => {
    const memory: CoachingMemory = {
      goal: params.goal,
      currentFitness: params.currentFitness,
      motivation: params.motivation,
      athleteBackground: params.athleteBackground,
      constraints: params.constraints,
      safetyFlags: params.safetyFlags || [],
    };
    return { memory, timestamp: new Date().toISOString() };
  },
});

/**
 * ASSESS: Record analysis, scratchpad updates, and coordinator signals.
 *
 * Output structure:
 * - Coordinator signals: draftReady, draftChanged, notes, directRequest
 * - Analysis: gapAnalysis, missingData, safetyFlags
 * - Scratchpad: planDraft, reasoning, tensions
 */
export const updateAssessment = tool({
  description: 'Record analysis, update plan scratchpad, and signal coordinator',
  inputSchema: z.object({
    // Coordinator signals (domain-free)
    draftReady: z
      .boolean()
      .describe('True when the scratchpad planDraft has enough substance to render as a document'),
    draftChanged: z
      .boolean()
      .describe('True when planDraft was modified this round'),
    notes: z
      .string()
      .describe('The most important coaching insight or question for this round — this is what the coach will say or ask'),
    directRequest: z
      .string()
      .optional()
      .describe('If the user asked for something outside coaching (e.g. "compare running shoes"), describe what they want'),

    // Analysis
    gapAnalysis: z
      .string()
      .optional()
      .describe('The specific gap between current and goal, e.g. "needs to drop 27 seconds from 4:47 to 4:20"'),
    missingData: z
      .array(z.string())
      .describe('Data points still needed'),
    safetyFlags: z
      .array(z.string())
      .describe('Safety concerns to shape the plan around'),

    // Scratchpad (working memory for plan reasoning)
    planDraft: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Updated training plan draft (partial TrainingBlock JSON). Include the COMPLETE current draft when plan changes.'),
    reasoning: z
      .string()
      .optional()
      .describe('Internal planning reasoning — alternatives considered, tradeoffs, tentative decisions'),
    tensions: z
      .array(z.string())
      .optional()
      .describe('Conflicts between the plan and known data that may surface questions'),
  }),
  execute: async (params) => {
    return {
      // Coordinator signals
      draftReady: params.draftReady,
      draftChanged: params.draftChanged,
      notes: params.notes,
      directRequest: params.directRequest,
      // Analysis
      gapAnalysis: params.gapAnalysis,
      missingData: params.missingData,
      safetyFlags: params.safetyFlags,
      // Scratchpad
      planDraft: params.planDraft,
      reasoning: params.reasoning,
      tensions: params.tensions,
    };
  },
});

/**
 * Static tools for the coaching workflow.
 * createDocument, updateDocument, and getDocument are injected per-request
 * in chat+api.ts because they need a DataStreamWriter for artifact streaming.
 */
export const coachingTools = {
  updateMemory,
  updateAssessment,
};
