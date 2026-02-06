/**
 * Coaching Workflow - Wally Fitness Coach
 *
 * A 6-state workflow for personalized training plan creation.
 *
 * States:
 * - GOAL_CAPTURE: User states high-level goal
 * - ANALYST: Determine what information is needed + implicit goal reframing
 * - INTAKE: Gather additional profile/fitness data
 * - SAFETY: Gate unsafe training approaches
 * - PLAN: Generate training block
 * - PRESENT: Display plan for user review/refinement
 *
 * Key Principle: "The system should know without telling"
 * - Apply age-based frameworks implicitly
 * - Reframe goals through questions, not explanations
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { WorkflowDefinition } from '../types';

// =============================================================================
// WORKFLOW DEFINITION
// =============================================================================

export type CoachingState =
  | 'GOAL_CAPTURE'
  | 'ANALYST'
  | 'INTAKE'
  | 'SAFETY'
  | 'PLAN'
  | 'PRESENT';

export const coachingWorkflow: WorkflowDefinition<CoachingState> = {
  id: 'coaching',
  name: 'Fitness Coaching',
  description:
    'Personalized training plan creation through goal capture, analysis, intake, safety check, and plan generation',

  states: {
    GOAL_CAPTURE: {
      name: 'Goal Capture',
      description: 'Capture the user\'s high-level fitness goal',
      model: 'haiku',
      tools: ['captureGoal'],
      // No toolChoice: 'required' - allow conversation before capturing
      instructions: `You are Wally, a friendly AI running coach. Your job is to understand the user's fitness goal.

IMPORTANT: Only call captureGoal when the user has EXPLICITLY stated a fitness goal.
Do NOT invent or assume a goal. If the user just says "hello" or asks a general question,
respond conversationally and ask what fitness goal they'd like to work toward.

Examples of clear goals that warrant calling captureGoal:
- "I want to run a 4:25 1500m"
- "I want to complete my first marathon"
- "I want to lose 10 pounds through running"
- "I want to improve my 5K time"

Examples where you should NOT call captureGoal yet:
- "Hello" / "Hi there" - greet them and ask about their goals
- "Can you help me?" - ask what they'd like help with
- Vague statements without a specific goal

Be warm and encouraging. When you clearly understand their goal, call captureGoal.`,
    },

    ANALYST: {
      name: 'Analyzing',
      description: 'Determine what information is needed for safe, effective plan creation',
      model: 'haiku', // Using haiku for testing (switch to sonnet for better analysis)
      tools: ['analyzeGoal'],
      toolChoice: 'required',
      instructions: (context) => `You are a sports science analyst. Given the user's goal, determine the MINIMUM data points required to create a safe, personalized training plan.

User's Goal: ${context.collectedData.goal || 'Not yet captured'}

Consider:
- Physiological factors (age, sex, injury history)
- Current fitness indicators (recent times, weekly volume)
- Contextual factors (timeline, equipment access, schedule constraints)
- Safety factors (any red flags that need medical clearance)
- Life stage appropriateness (is this goal aligned with sustainable health?)

IMPORTANT: Apply age-based coaching frameworks IMPLICITLY:
- Ages 10-25: Challenge-driven, growth mindset
- Ages 25-35: Essentialism, focus on what matters most
- Ages 35+: Longevity focus, sustainable systems

Do NOT name these frameworks to the user. Let them discover constraints through your questions.

Call analyzeGoal with the required intake fields.`,
    },

    INTAKE: {
      name: 'Getting to Know You',
      description: 'Gather required information in a conversational way',
      model: 'haiku',
      tools: ['collectData', 'intakeComplete'],
      instructions: (context) => {
        const schema = context.collectedData.intakeSchema;
        const collected = context.collectedData.intakeData || {};
        const collectedFields = Object.keys(collected);

        return `You are Wally, a friendly running coach gathering information before creating a training plan.

Your ONLY job is to collect these data points:
${(schema as any)?.requiredFields?.map((f: any) => `- ${f.fieldName}: ${f.question}`).join('\n') || 'No schema yet'}

Already collected: ${collectedFields.length > 0 ? collectedFields.join(', ') : 'Nothing yet'}

Rules:
1. Ask questions naturally, not like a form. Acknowledge what the user shares.
2. You may ask multiple related questions in one turn if it flows naturally.
3. If the user provides information unprompted, acknowledge and use collectData to record it.
4. Do NOT offer training advice. Do NOT generate a plan yet.
5. If the user asks for a plan, say: "I want to make sure I build you the right plan - let me just get a few more details first."
6. When all required fields are gathered, summarize what you know and call intakeComplete.

Use collectData for EACH piece of information gathered.`;
      },
    },

    SAFETY: {
      name: 'Safety Check',
      description: 'Validate collected data against safety rules',
      model: 'haiku',
      tools: ['safetyCheck'],
      toolChoice: 'required',
      instructions: (context) => {
        const profile = context.collectedData.intakeData || {};
        return `Review the athlete profile and run safety checks.

Profile:
${JSON.stringify(profile, null, 2)}

Call safetyCheck with the profile data. The tool will run safety rules and return any warnings or contraindications.

Present any warnings as a caring coach, not a liability waiver.
Example: "Six days is solid. I want to make sure you've got at least one full recovery day—that's where the adaptation actually happens."`;
      },
    },

    PLAN: {
      name: 'Building Your Plan',
      description: 'Generate personalized training plan',
      model: 'haiku', // Using haiku for testing (switch to sonnet for better plans)
      tools: ['generatePlan'],
      toolChoice: 'required',
      instructions: (context) => {
        const profile = context.collectedData.intakeData || {};
        const safety = context.collectedData.safetyResult || {};
        const goal = context.collectedData.goal || '';

        return `You are an expert running coach creating a personalized training plan.

Athlete Profile:
${JSON.stringify(profile, null, 2)}

Goal: ${goal}

Safety Constraints:
- Warnings: ${(safety as any).warnings?.join(', ') || 'None'}
- Contraindications: ${(safety as any).contraindications?.join(', ') || 'None'}
- Recommendations: ${(safety as any).recommendations?.join(', ') || 'None'}

Create a periodized training plan that:
1. Respects the athlete's current fitness level and available time
2. Incorporates appropriate progressions (no more than 10% weekly increase)
3. Avoids all contraindicated activities
4. Addresses the safety warnings appropriately
5. Includes a mix of workout types (easy, tempo, intervals, long run)
6. Has 1-2 rest days per week

Call generatePlan with the complete training plan.`;
      },
    },

    PRESENT: {
      name: 'Your Plan',
      description: 'Present plan and handle refinement requests',
      model: 'haiku',
      tools: ['refinePlan', 'acceptPlan'],
      instructions: `You are Wally presenting the training plan to the user.

The plan has been generated and is displayed in the panel on the right.

Your job:
1. Briefly summarize the plan structure and key workouts
2. Explain the reasoning behind any important decisions
3. Answer questions: "Why did you include X?" "Can I swap Y for Z?"
4. If they request changes, use refinePlan to modify the plan
5. If they're happy with it, ask if they want to accept and use acceptPlan

Be encouraging! This is an exciting moment - they're about to start their training journey.`,
    },
  },

  transitions: [
    // GOAL_CAPTURE -> ANALYST
    {
      from: 'GOAL_CAPTURE',
      to: 'ANALYST',
      trigger: { type: 'tool', toolName: 'captureGoal' },
    },
    // ANALYST -> INTAKE
    {
      from: 'ANALYST',
      to: 'INTAKE',
      trigger: { type: 'tool', toolName: 'analyzeGoal' },
    },
    // INTAKE -> SAFETY
    {
      from: 'INTAKE',
      to: 'SAFETY',
      trigger: { type: 'tool', toolName: 'intakeComplete' },
    },
    // SAFETY -> PLAN
    {
      from: 'SAFETY',
      to: 'PLAN',
      trigger: { type: 'tool', toolName: 'safetyCheck' },
    },
    // PLAN -> PRESENT
    {
      from: 'PLAN',
      to: 'PRESENT',
      trigger: { type: 'tool', toolName: 'generatePlan' },
    },
    // PRESENT -> PLAN (refinement)
    {
      from: 'PRESENT',
      to: 'PLAN',
      trigger: { type: 'tool', toolName: 'refinePlan' },
    },
  ],

  initialState: 'GOAL_CAPTURE',
  terminalStates: ['PRESENT'], // Stops when acceptPlan is called
  defaultModel: 'haiku',
  maxSteps: 30,
};

// =============================================================================
// TOOLS
// =============================================================================

/**
 * GOAL_CAPTURE: Capture the user's fitness goal
 */
export const captureGoal = tool({
  description: 'Capture the user\'s fitness goal',
  inputSchema: z.object({
    goal: z.string().describe('The user\'s stated fitness goal'),
    goalType: z
      .enum(['performance', 'endurance', 'weight_loss', 'general_fitness', 'first_race'])
      .describe('Category of the goal'),
    sport: z.string().default('running').describe('Primary sport'),
    event: z.string().optional().describe('Specific event (e.g., "1500m", "marathon")'),
    targetMetric: z.string().optional().describe('Target time/pace/distance if specified'),
  }),
  execute: async (params) => {
    return {
      captured: true,
      goal: params.goal,
      goalType: params.goalType,
      sport: params.sport,
      event: params.event,
      targetMetric: params.targetMetric,
    };
  },
});

/**
 * ANALYST: Analyze goal and generate intake schema
 */
export const analyzeGoal = tool({
  description: 'Analyze the goal and determine what intake data is needed',
  inputSchema: z.object({
    goalType: z.string().describe('Type of goal'),
    sport: z.string().describe('Primary sport'),
    event: z.string().optional().describe('Specific event'),
    targetMetric: z.string().optional().describe('Target metric'),
    estimatedDifficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('Difficulty level'),
    suggestedTimeframe: z.string().optional().describe('Suggested timeframe'),
    requiredFieldsJson: z.string().describe('JSON array of required intake fields with fieldName, question, reason, priority'),
    implicitReframe: z.string().optional().describe('Internal note about goal reframing - not shared with user'),
  }),
  execute: async (params) => {
    // Parse the JSON string for required fields
    let requiredFields: Array<{fieldName: string; question: string; reason: string; priority: string}> = [];
    try {
      requiredFields = JSON.parse(params.requiredFieldsJson);
    } catch (e) {
      console.error('Failed to parse requiredFieldsJson:', e);
    }
    return {
      analyzed: true,
      intakeSchema: {
        goalAnalysis: {
          goalType: params.goalType,
          sport: params.sport,
          event: params.event,
          targetMetric: params.targetMetric,
          estimatedDifficulty: params.estimatedDifficulty,
          suggestedTimeframe: params.suggestedTimeframe,
        },
        requiredFields,
        implicitReframe: params.implicitReframe,
      },
    };
  },
});

/**
 * INTAKE: Collect individual data points
 */
export const collectData = tool({
  description: 'Record a piece of information provided by the user',
  inputSchema: z.object({
    fieldName: z.string().describe('The field being collected'),
    value: z.string().describe('The value provided (as a string)'),
    confidence: z
      .enum(['explicit', 'inferred'])
      .describe('Whether user stated this directly or it was inferred'),
  }),
  execute: async (params) => {
    return {
      collected: true,
      fieldName: params.fieldName,
      value: params.value,
    };
  },
});

/**
 * INTAKE: Signal that all required data has been gathered
 */
export const intakeComplete = tool({
  description: 'Signal that all required intake fields have been gathered',
  inputSchema: z.object({
    collectedDataJson: z.string().describe('All collected intake data as a JSON object string'),
    summary: z.string().describe('Brief summary of what was learned about the athlete'),
  }),
  execute: async (params) => {
    // Parse the JSON string
    let collectedData = {};
    try {
      collectedData = JSON.parse(params.collectedDataJson);
    } catch (e) {
      console.error('Failed to parse collectedDataJson:', e);
    }
    return {
      intakeComplete: true,
      intakeData: collectedData,
      summary: params.summary,
    };
  },
});

/**
 * SAFETY: Run safety checks on the profile
 */
export const safetyCheck = tool({
  description: 'Run safety checks on the athlete profile',
  inputSchema: z.object({
    profileJson: z.string().describe('The athlete profile data as a JSON object string'),
  }),
  execute: async ({ profileJson }) => {
    // Parse the JSON string
    let profile: Record<string, unknown> = {};
    try {
      profile = JSON.parse(profileJson);
    } catch (e) {
      console.error('Failed to parse profileJson:', e);
    }

    const warnings: string[] = [];
    const contraindications: string[] = [];
    const recommendations: string[] = [];

    // Age-based checks
    const age = Number(profile.age);
    const trainingDays = Number(profile.training_days || profile.trainingDays);
    const weeklyVolume = Number(profile.weekly_volume || profile.weeklyVolume || 0);

    if (age > 50 && trainingDays > 6) {
      warnings.push(
        'Training 7 days/week at 50+ increases injury risk. Consider 5-6 days with proper recovery.'
      );
    }

    if (age > 40 && weeklyVolume > 80) {
      warnings.push(
        'High volume (80+ km/week) for masters athletes requires careful load management.'
      );
    }

    // Injury history checks
    const injuryHistory = String(profile.injury_history || profile.injuryHistory || '').toLowerCase();

    if (injuryHistory.includes('stress fracture')) {
      contraindications.push('Gradual volume increases only due to stress fracture history');
      recommendations.push('Consider bone density assessment');
    }

    if (injuryHistory.includes('achilles') || injuryHistory.includes('plantar')) {
      recommendations.push('Include calf strengthening and mobility work');
    }

    // Volume progression checks
    if (weeklyVolume < 20 && profile.goalType === 'performance') {
      recommendations.push(
        'Build base fitness before adding intense speedwork - focus on consistent easy running first'
      );
    }

    const status =
      contraindications.length > 0
        ? 'approved_with_warnings'
        : warnings.length > 0
          ? 'approved_with_warnings'
          : 'approved';

    return {
      safetyChecked: true,
      safetyResult: {
        status,
        warnings,
        contraindications,
        recommendations,
      },
    };
  },
});

/**
 * PLAN: Generate the training plan
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
    summary: z.string().describe('Brief summary of the plan philosophy'),
  }),
  execute: async (params) => {
    // In a real implementation, this would trigger the training-block artifact creation
    return {
      planGenerated: true,
      plan: params,
    };
  },
});

/**
 * PRESENT: Refine the plan based on feedback
 */
export const refinePlan = tool({
  description: 'Modify the training plan based on user feedback',
  inputSchema: z.object({
    modification: z.string().describe('What change the user requested'),
    affectedWeeks: z.array(z.number()).optional().describe('Which weeks are affected'),
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
 * PRESENT: User accepts the plan
 */
export const acceptPlan = tool({
  description: 'User accepts the training plan',
  inputSchema: z.object({
    confirmed: z.boolean().describe('Whether the user confirmed acceptance'),
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
  captureGoal,
  analyzeGoal,
  collectData,
  intakeComplete,
  safetyCheck,
  generatePlan,
  refinePlan,
  acceptPlan,
};
