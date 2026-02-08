# Health Coach Flow Engineering Architecture

## Overview

This document describes the "Flow Engineering" architecture for Health Coach's coaching system, implementing the principles from the Gemini deep research on structured agent workflows.

**Core Principles:**

1. **Static States + Dynamic Slots**
   - The *process* (states and transitions) is deterministic and engineer-defined
   - The *content* (what questions to ask, what factors to consider) is AI-generated based on the user's goal

2. **The Unspoken Understanding Constraint**
   - The system should *know without telling*
   - Naming a user's motivation may impair their connection to it (verbal overshadowing)
   - Act on understanding implicitly rather than explaining frameworks
   - See `docs/philosophy.md` for full details

---

## State Machine Design

```
                         ┌──────────────────────┐
                         │   implicit reframe   │
                         │                      │
                         ▼                      │
┌──────────┐    ┌──────────┐    ┌──────────┐    │    ┌──────────┐    ┌───────┐
│  GOAL    │───▶│ ANALYST  │───▶│  INTAKE  │───▶┴───▶│  SAFETY  │───▶│ PLAN  │
│ CAPTURE  │◀───│(Reframe?)│    │ (Gather) │         │  (Gate)  │    │ (Gen) │
└──────────┘    └──────────┘    └──────────┘         └──────────┘    └───────┘
     ▲                                                                    │
     │                                                                    ▼
     │                                                               ┌───────┐
     │                                                               │PRESENT│
     │                                                               │(Refine)│
     │                                                               └───────┘
     │                                                                    │
     └────────────────────────────────────────────────────────────────────┘
                              (goal change)
```

**Key Insight:** GOAL_CAPTURE and ANALYST have a looping relationship. The ANALYST may determine that the user's stated goal should be *implicitly reframed* based on their profile (age, injury history, etc.). This reframing happens through the questions asked, not through explicit explanation.

---

## State Definitions

### State 1: GOAL_CAPTURE

**Purpose:** Capture the user's high-level goal and apply critical evaluation based on who they are.

**Trigger:** User starts a new coaching session or changes their goal.

**Output:** `goal: string` (e.g., "I want to run a 4:25 1500m")

**Transition:** → ANALYST

**Critical Evaluation (Implicit):**

GOAL_CAPTURE isn't just extraction—it's the beginning of *goal negotiation*. Different life stages call for different coaching approaches, informed by these frameworks:

| Age Range | Framework | Implicit Approach |
|-----------|-----------|-------------------|
| **10-25** | Yeager (10 to 25) | Jump into training blocks for stated goals; build the engine |
| **25-35** | McKeown (Essentialism) | Help identify focus; less but better |
| **35+** | Brooks (From Strength to Strength) | Longevity focus, biometric baselines, sustainable systems |

**Important:** These frameworks inform behavior but are *never named to the user*. The user experiences a coach who asks the right questions, not a system that categorizes them.

**Notes:** This can be implicit (user just types their goal) or explicit (UI prompts "What's your goal?")

---

### State 2: ANALYST (Generative Schema + Implicit Reframing)

**Purpose:**
1. Determine what information is needed to safely and effectively achieve the goal
2. Potentially *reframe* the goal based on user profile (without explicitly naming the reframe)

**Trigger:** Goal captured.

**Model:** Reasoning model (Claude Sonnet/Opus) - this is a "thinking" task.

**The Reframing Loop:**

The ANALYST may determine that the stated goal should be nested inside a larger goal. For example:

- **Stated:** "I want to run a 4:25 1500m"
- **User is:** 43 years old, returning to running after years off
- **Reframed (internal):** "Build sustainable speed with longevity as foundation"
- **User experiences:** Questions about recovery, sleep, injury history that *happen* to guide toward a more sustainable approach

The reframe is never stated. The user discovers their own constraints through the questions.

**System Prompt:**
```
You are a sports science analyst. Given the user's goal, determine the MINIMUM
data points required to create a safe, personalized training plan.

Consider:
- Physiological factors (age, sex, injury history)
- Current fitness indicators (recent times, weekly volume)
- Contextual factors (timeline, equipment access, schedule constraints)
- Safety factors (any red flags that need medical clearance)
- Life stage appropriateness (is this goal aligned with sustainable health?)

Output a JSON schema of required fields, each with:
- fieldName: machine-readable identifier
- question: natural language question to ask the user
- reason: internal reason (NOT shown to user) for why this matters
- userFacingReason: optional brief context if the question seems unusual
- priority: "required" | "recommended" | "optional"
- validation: any constraints (e.g., "must be positive number")

If the goal may benefit from reframing, include questions that help the user
discover relevant constraints themselves. Do NOT tell them their goal is wrong.
```

**Output:** `IntakeSchema` - the dynamic "form" for the next state

**Transition Options:**
- → INTAKE (proceed with schema)
- → GOAL_CAPTURE (implicit reframe via questions that surface new understanding)

**Example Output:**
```json
{
  "goalAnalysis": {
    "goalType": "performance",
    "sport": "running",
    "event": "1500m",
    "targetTime": "4:25"
  },
  "requiredFields": [
    {
      "fieldName": "age",
      "question": "How old are you?",
      "reason": "Recovery capacity and training load tolerance vary significantly with age",
      "priority": "required",
      "validation": { "type": "number", "min": 13, "max": 100 }
    },
    {
      "fieldName": "current_1500_time",
      "question": "What's your current or most recent 1500m time?",
      "reason": "Gap analysis - determines how much improvement is needed",
      "priority": "required"
    },
    {
      "fieldName": "recent_race",
      "question": "Do you have any recent race times (5K, mile, etc.)?",
      "reason": "Cross-validates fitness level and predicts capabilities",
      "priority": "recommended"
    },
    {
      "fieldName": "weekly_volume",
      "question": "What's your current weekly running volume (km or miles)?",
      "reason": "Determines safe rate of volume/intensity progression",
      "priority": "required"
    },
    {
      "fieldName": "injury_history",
      "question": "Any current injuries or recurring issues I should know about?",
      "reason": "Certain exercises may be contraindicated",
      "priority": "required"
    },
    {
      "fieldName": "training_days",
      "question": "How many days per week can you train?",
      "reason": "Constrains plan structure and recovery windows",
      "priority": "required"
    },
    {
      "fieldName": "target_race_date",
      "question": "When are you hoping to hit this goal? Any specific race?",
      "reason": "Determines periodization timeline",
      "priority": "recommended"
    },
    {
      "fieldName": "track_access",
      "question": "Do you have access to a track for interval workouts?",
      "reason": "Affects workout prescription (track vs road intervals)",
      "priority": "optional"
    }
  ],
  "safetyFlags": [
    {
      "condition": "age > 40 AND weekly_volume > 80",
      "action": "flag_high_volume_masters"
    },
    {
      "condition": "injury_history contains 'stress fracture'",
      "action": "require_medical_clearance"
    }
  ]
}
```

**Transition:** Automatic → INTAKE

---

### State 3: INTAKE (Data Gathering)

**Purpose:** Collect all required information from the user in a natural, conversational way.

**Trigger:** IntakeSchema generated.

**Model:** Fast model (Claude Haiku) - this is a "conversation" task, not "thinking."

**System Prompt:**
```
You are a friendly running coach assistant gathering information before creating
a training plan. Your ONLY job is to collect the following data points:

{IntakeSchema.requiredFields}

Rules:
1. Ask questions naturally, not like a form. Acknowledge what the user shares.
2. You may ask multiple related questions in one turn if it flows naturally.
3. If the user provides information unprompted, acknowledge and record it.
4. Do NOT offer training advice. Do NOT generate a plan.
5. If the user asks for a plan, say: "I want to make sure I build you the right
   plan - let me just get a few more details first."
6. When all required fields are gathered, confirm the summary and ask if anything
   is missing or incorrect.
```

**State Object:**
```typescript
interface IntakeState {
  schema: IntakeSchema;
  collected: Record<string, any>;  // fieldName -> value
  missing: string[];               // fieldNames not yet collected
  conversationHistory: Message[];
}
```

**Hard Gate (Code, not AI):**
```typescript
function canTransitionToSafety(state: IntakeState): boolean {
  const requiredFields = state.schema.requiredFields
    .filter(f => f.priority === 'required')
    .map(f => f.fieldName);

  return requiredFields.every(field => state.collected[field] != null);
}
```

**Transition:** When `canTransitionToSafety()` returns true → SAFETY

---

### State 4: SAFETY (Gate)

**Purpose:** Validate the collected data against safety rules before plan generation.

**Trigger:** All required intake fields collected.

**Model:** Can be deterministic code OR a specialized safety model.

**Implementation Options:**

**Option A: Deterministic Rules (Recommended for MVP)**
```typescript
interface SafetyCheck {
  check: (data: IntakeData) => boolean;
  failureMessage: string;
  action: 'block' | 'warn' | 'flag_for_review';
}

const safetyChecks: SafetyCheck[] = [
  {
    check: (d) => !(d.age > 50 && d.training_days > 6),
    failureMessage: "Training 7 days/week at 50+ increases injury risk significantly",
    action: 'warn'
  },
  {
    check: (d) => !(d.injury_history?.includes('stress fracture') && d.weekly_volume > 60),
    failureMessage: "History of stress fractures with high volume - recommend medical clearance",
    action: 'flag_for_review'
  },
  // ...more rules
];
```

**Option B: AI Safety Reviewer (Future enhancement)**
```
You are a sports medicine safety reviewer. Analyze this athlete profile and
training request for potential risks.

Profile: {collectedData}
Goal: {originalGoal}

Output JSON:
- status: "approved" | "approved_with_warnings" | "requires_review"
- warnings: string[] (concerns to communicate to user)
- contraindications: string[] (things to avoid in the plan)
- recommendations: string[] (modifications to consider)
```

**Output:** `SafetyResult`
```typescript
interface SafetyResult {
  status: 'approved' | 'approved_with_warnings' | 'blocked';
  warnings: string[];
  contraindications: string[];
  recommendations: string[];
}
```

**Transition:**
- If `approved` or `approved_with_warnings` → PLAN
- If `blocked` → Return to user with explanation, potentially INTAKE for more info

---

### State 5: PLAN (Generation)

**Purpose:** Generate the actual training plan based on collected data and safety constraints.

**Trigger:** Safety check passed.

**Model:** Reasoning model (Claude Sonnet/Opus) - this requires domain expertise.

**System Prompt:**
```
You are an expert running coach creating a personalized training plan.

Athlete Profile:
{collectedData}

Goal: {originalGoal}
Timeline: {targetDate}

Safety Constraints:
- Warnings: {safetyResult.warnings}
- Contraindications: {safetyResult.contraindications}
- Recommendations: {safetyResult.recommendations}

Create a periodized training plan that:
1. Respects the athlete's current fitness level and available time
2. Incorporates appropriate progressions
3. Avoids all contraindicated activities
4. Addresses the safety warnings appropriately

Output the plan as a structured TrainingBlock artifact.
```

**Output:** `TrainingBlock` artifact (using existing Health Coach artifact system)

**Transition:** Automatic → PRESENT

---

### State 6: PRESENT (Refinement Loop)

**Purpose:** Present the plan to the user and handle refinement requests.

**Trigger:** Plan generated.

**Model:** Fast model (Haiku) for clarifications, Reasoning model if plan changes needed.

**Behaviors:**
- Show the plan with the WeekBar/calendar UI
- Explain the reasoning behind key decisions
- Handle questions: "Why did you include X?" "Can I swap Y for Z?"
- Route refinement requests back to PLAN if significant changes needed

**Transition:**
- User accepts → Session complete, plan saved
- User requests changes → PLAN (with modification context)
- User changes goal → GOAL_CAPTURE (start over)

---

## Model Routing Strategy

| State | Model | Reasoning |
|-------|-------|-----------|
| ANALYST | Sonnet/Opus | Requires domain expertise to know what questions matter |
| INTAKE | Haiku | Conversational, no deep reasoning needed |
| SAFETY | Code + Haiku | Deterministic rules + AI for edge cases |
| PLAN | Sonnet/Opus | Requires expertise and structured output |
| PRESENT | Haiku (+ Sonnet for changes) | Mostly Q&A, escalate for plan modifications |

---

## State Persistence

The entire state machine state should be persisted to enable:
- Resume interrupted sessions
- Audit trail of how the plan was created
- Debugging when things go wrong

```typescript
interface CoachingSession {
  id: string;
  userId: string;
  currentState: 'GOAL_CAPTURE' | 'ANALYST' | 'INTAKE' | 'SAFETY' | 'PLAN' | 'PRESENT';

  // State-specific data
  goal?: string;
  intakeSchema?: IntakeSchema;
  collectedData?: Record<string, any>;
  safetyResult?: SafetyResult;
  generatedPlan?: TrainingBlock;

  // History
  stateTransitions: Array<{
    from: string;
    to: string;
    timestamp: Date;
    reason: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## UI Considerations

### State Indicator
Show the user where they are in the process (subtle, not clinical):
```
[Goal] → [Understanding You] → [Building Plan] → [Your Plan]
   ✓           ●
```

Note: SAFETY is invisible to the user. It happens between states, not as a visible step.

### Transparency About Process, Mystery About Motivation

**Be transparent about:**
- What stage we're in ("I'm going to ask you some questions...")
- The structure of the plan once generated
- What data we've collected (if they ask)

**Preserve mystery about:**
- Why *specific* questions matter for *them* (don't cite age frameworks)
- The reframing of their goal (let them discover constraints)
- The psychological model being applied

**Anti-pattern:**
> "At 43, research suggests focusing on longevity before speed. Based on Arthur Brooks' work..."

**Better pattern:**
> "That's a solid goal. Before we map out the path to 4:25, I want to make sure we build something that'll serve you for years, not just one race."

### Safety as Care, Not Compliance

Safety warnings should feel like a coach who cares, not a liability waiver.

**Anti-pattern:**
> "Warning: Training 7 days/week at age 50+ increases injury risk. Acknowledge?"

**Better pattern:**
> "Six days is solid. I want to make sure you've got at least one full recovery day—that's where the adaptation actually happens."

### Escape Hatches
- User can always say "just give me a plan" - but we guide them naturally, not block them
- User can skip optional questions
- User can go back and correct earlier answers

---

## Implementation Phases

### Phase 1: Static Schema (MVP)
- Hard-code the IntakeSchema for common goals (1500m, 5K, marathon)
- Implement the state machine with fixed states
- Prove the UX works

### Phase 2: Generative Schema
- Implement the ANALYST step
- Allow dynamic schema generation based on any goal
- A/B test against static schemas

### Phase 3: Dynamic Safety
- Replace deterministic safety rules with AI reviewer
- Enable more nuanced safety checking
- Add "human in the loop" for edge cases

### Phase 4: Adaptive Workflows
- Allow ANALYST to suggest additional states for complex goals
- E.g., "This goal requires a nutrition component" → add NUTRITION_INTAKE state

---

## Open Questions

1. **How to handle goal changes mid-session?**
   - Start over? Try to preserve relevant collected data?

2. **How to handle multi-goal users?**
   - "I want to run a fast 1500m AND lose 10 lbs"
   - Multiple parallel workflows? Merged workflow?

3. **How much state should be visible in the chat UI?**
   - Show the "stage" explicitly?
   - Or make it feel seamless/invisible?

4. **How to train users on the process?**
   - First-time user education?
   - Progress indicators?

---

## AI SDK v6 Implementation

The Vercel AI SDK v6 introduces `ToolLoopAgent` with primitives that map directly to our state machine design.

### Key AI SDK v6 Features

| Feature | Purpose | Our Use Case |
|---------|---------|--------------|
| `prepareStep` | Mutate settings before each step | **State machine transitions** - change model, tools, instructions based on current state |
| `stopWhen` | Conditions for ending the loop | Gate enforcement - stop when intake complete, stop when plan accepted |
| `activeTools` | Restrict available tools per step | Phase-based restriction - INTAKE only gets `collectData`, PLAN only gets `generatePlan` |
| `toolChoice: 'required'` | Force tool usage | Ensure structured data collection in INTAKE phase |
| `onStepFinish` | Callback after each step | Persist state to database, track transitions |

### Implementation Pattern

```typescript
import { ToolLoopAgent, stepCountIs, hasToolCall } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// State is derived from tool results in the conversation
type CoachingState = 'ANALYST' | 'INTAKE' | 'SAFETY' | 'PLAN' | 'PRESENT';

function deriveState(toolResults: ToolResult[]): CoachingState {
  const hasSchema = toolResults.some(r => r.toolName === 'analyzeGoal');
  const hasIntakeComplete = toolResults.some(r => r.toolName === 'intakeComplete');
  const hasSafetyPassed = toolResults.some(r => r.toolName === 'safetyCheck');
  const hasPlan = toolResults.some(r => r.toolName === 'generatePlan');

  if (hasPlan) return 'PRESENT';
  if (hasSafetyPassed) return 'PLAN';
  if (hasIntakeComplete) return 'SAFETY';
  if (hasSchema) return 'INTAKE';
  return 'ANALYST';
}

const coachingAgent = new ToolLoopAgent({
  model: anthropic('claude-sonnet-4-20250514'), // Default model

  tools: {
    analyzeGoal,      // ANALYST: generates IntakeSchema
    collectData,      // INTAKE: structured data collection
    intakeComplete,   // INTAKE: signals all required data gathered
    safetyCheck,      // SAFETY: validates profile against rules
    generatePlan,     // PLAN: creates TrainingBlock
    refinePlan,       // PRESENT: handles modification requests
    acceptPlan,       // PRESENT: user accepts, ends session
  },

  prepareStep: ({ stepNumber, messages, toolResults }) => {
    const state = deriveState(toolResults);

    switch (state) {
      case 'ANALYST':
        return {
          model: anthropic('claude-sonnet-4-20250514'),
          activeTools: ['analyzeGoal'],
          toolChoice: 'required', // Must call analyzeGoal
          instructions: `
            You are a sports science analyst. Analyze the user's goal and determine
            what information is needed to create a safe, personalized plan.
            Call the analyzeGoal tool with the required fields.
          `,
        };

      case 'INTAKE':
        return {
          model: anthropic('claude-haiku-4-5'), // Cheap model for conversation
          activeTools: ['collectData', 'intakeComplete'],
          instructions: `
            You are a friendly coach assistant gathering information.
            Use collectData to record each piece of information the user provides.
            When all required fields are gathered, call intakeComplete.
            Do NOT offer training advice or generate a plan.
          `,
        };

      case 'SAFETY':
        return {
          model: anthropic('claude-haiku-4-5'),
          activeTools: ['safetyCheck'],
          toolChoice: 'required',
          instructions: `
            Review the collected athlete profile and run safety checks.
            Call safetyCheck with the full profile data.
          `,
        };

      case 'PLAN':
        return {
          model: anthropic('claude-sonnet-4-20250514'), // Reasoning model
          activeTools: ['generatePlan'],
          toolChoice: 'required',
          instructions: `
            You are an expert running coach. Create a personalized training plan
            based on the athlete profile and safety constraints.
            Output the plan as a structured TrainingBlock.
          `,
        };

      case 'PRESENT':
        return {
          model: anthropic('claude-haiku-4-5'),
          activeTools: ['refinePlan', 'acceptPlan'],
          instructions: `
            Present the training plan to the user. Answer questions about the plan.
            If they request changes, use refinePlan. If they accept, use acceptPlan.
          `,
        };
    }
  },

  stopWhen: [
    hasToolCall('acceptPlan'),  // User accepted the plan
    stepCountIs(50),            // Safety limit
  ],

  onStepFinish: async ({ stepNumber, toolCalls, toolResults }) => {
    // Persist state to database for resume/audit
    await persistCoachingState({
      stepNumber,
      state: deriveState(toolResults),
      toolCalls,
      toolResults,
    });
  },
});

// Usage
const result = await coachingAgent.generate({
  prompt: "I want to run a 4:25 1500m",
});
```

### Tool Definitions

```typescript
import { tool } from 'ai';
import { z } from 'zod';

// ANALYST tool - generates the intake schema
const analyzeGoal = tool({
  description: 'Analyze the user goal and determine required intake fields',
  parameters: z.object({
    goalType: z.enum(['performance', 'fitness', 'weight_loss', 'health']),
    sport: z.string(),
    event: z.string().optional(),
    targetMetric: z.string().optional(),
    requiredFields: z.array(z.object({
      fieldName: z.string(),
      question: z.string(),
      reason: z.string(),
      priority: z.enum(['required', 'recommended', 'optional']),
    })),
  }),
  execute: async (params) => {
    // Store schema in session state
    return { success: true, schema: params };
  },
});

// INTAKE tool - collects individual data points
const collectData = tool({
  description: 'Record a piece of information provided by the user',
  parameters: z.object({
    fieldName: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
    confidence: z.enum(['explicit', 'inferred']),
  }),
  execute: async (params) => {
    // Store in session state
    return { success: true, recorded: params.fieldName };
  },
});

// INTAKE completion signal
const intakeComplete = tool({
  description: 'Signal that all required intake fields have been gathered',
  parameters: z.object({
    collectedFields: z.record(z.any()),
    missingOptional: z.array(z.string()),
  }),
  execute: async (params) => {
    // Validate all required fields present
    return { success: true, readyForSafety: true };
  },
});

// SAFETY tool
const safetyCheck = tool({
  description: 'Run safety checks on the athlete profile',
  parameters: z.object({
    profile: z.record(z.any()),
  }),
  execute: async ({ profile }) => {
    // Run deterministic safety rules
    const warnings = [];
    const contraindications = [];

    if (profile.age > 50 && profile.training_days > 6) {
      warnings.push('Training 7 days/week at 50+ increases injury risk');
    }

    if (profile.injury_history?.includes('stress fracture') && profile.weekly_volume > 60) {
      contraindications.push('Reduce volume due to stress fracture history');
    }

    return {
      status: contraindications.length > 0 ? 'approved_with_warnings' : 'approved',
      warnings,
      contraindications,
    };
  },
});

// PLAN tool - generates the training block
const generatePlan = tool({
  description: 'Generate a personalized training plan',
  parameters: z.object({
    profile: z.record(z.any()),
    safetyConstraints: z.object({
      warnings: z.array(z.string()),
      contraindications: z.array(z.string()),
    }),
    plan: TrainingBlockSchema, // Your existing schema
  }),
  execute: async (params) => {
    // Store plan, trigger artifact creation
    return { success: true, planId: 'generated-plan-id' };
  },
});

// PRESENT tools
const refinePlan = tool({
  description: 'Modify the training plan based on user feedback',
  parameters: z.object({
    modification: z.string(),
    affectedWeeks: z.array(z.number()).optional(),
  }),
  execute: async (params) => {
    return { success: true, needsRegeneration: true };
  },
});

const acceptPlan = tool({
  description: 'User accepts the training plan',
  parameters: z.object({
    confirmed: z.boolean(),
  }),
  // No execute function - this is a "done" tool that stops the loop
});
```

### Why ToolLoopAgent vs. Manual Loop

| Approach | Pros | Cons |
|----------|------|------|
| **ToolLoopAgent** | Native AI SDK, built-in loop control, model routing via `prepareStep` | State derived from tool results (less explicit) |
| **Manual generateText loop** | Full control, explicit state management | More boilerplate, reinventing the wheel |
| **Multiple agents (one per state)** | Very explicit separation | Manual orchestration between agents |

**Recommendation:** Use `ToolLoopAgent` with `prepareStep` - it's the intended pattern and provides all the primitives we need.

### Integration with Existing Health Coach Architecture

The `ToolLoopAgent` integrates with Health Coach's existing systems:

1. **Artifact System** - The `generatePlan` tool triggers `training-block` artifact creation via `dataStream.write()`

2. **Tool Approval** - Tools like `generatePlan` can have `needsApproval: true` for human-in-the-loop

3. **Database Persistence** - `onStepFinish` persists to the existing `CoachingSession` table

4. **Chat UI** - The agent streams responses via `coachingAgent.stream()` compatible with existing `useChat`

---

---

## Related Documents

- **[Philosophy](../philosophy.md)** - Core design principles including "The Unspoken Understanding Constraint"

---

## References

### Research & Frameworks
- Gemini Deep Research: "The Architect's Dilemma in the Age of Imminent AGI"
- Schooler & Engstler-Schooler (1990): Verbal Overshadowing
- Wilson & Schooler (1991): Thinking Too Much
- Wilson & Gilbert (2008): Explaining Away / AREA Model
- CoALA Framework: Cognitive Architectures for Language Agents

### Age-Based Coaching Frameworks
- Yeager, D. (2024). 10 to 25: The Science of Motivating Young People
- McKeown, G. (2014). Essentialism: The Disciplined Pursuit of Less
- Brooks, A. C. (2022). From Strength to Strength

### Technical
- AI SDK v6 Agents Overview: https://ai-sdk.dev/docs/agents/overview
- AI SDK v6 Loop Control: https://ai-sdk.dev/docs/agents/loop-control
- AI SDK ToolLoopAgent Reference: https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent
- LangGraph documentation: https://langchain-ai.github.io/langgraph/
- Vercel AI SDK generateObject: https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data
