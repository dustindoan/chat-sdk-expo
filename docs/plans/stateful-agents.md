# Stateful Agents Infrastructure

## Overview

This document describes the general-purpose infrastructure for building stateful agent workflows in ai-chat-app. This infrastructure is domain-agnostic and provides the primitives that domain-specific implementations (like Wally's coaching workflow) can build upon.

**Design Goal:** Provide the minimal abstraction layer over AI SDK v6's `ToolLoopAgent` that enables:
1. Declarative workflow definition
2. State-based model routing
3. State-based tool restriction
4. Hard gates between states
5. State persistence and resumability

---

## Core Abstractions

### WorkflowDefinition

The declarative specification of a stateful workflow.

```typescript
// lib/agents/types.ts

/**
 * Configuration for a single state in the workflow
 */
interface StateConfig {
  /** Human-readable name for this state */
  name: string;

  /** Description of what happens in this state */
  description?: string;

  /** Model to use in this state (overrides default) */
  model?: 'haiku' | 'sonnet' | 'opus' | ModelConfig;

  /** Tools available in this state (by name) */
  tools: string[];

  /** Force tool usage? */
  toolChoice?: 'auto' | 'required' | { type: 'tool'; toolName: string };

  /** System instructions for this state */
  instructions: string | ((context: WorkflowContext) => string);

  /** Is this state invisible to the user? (e.g., SAFETY) */
  hidden?: boolean;
}

/**
 * A transition between states
 */
interface StateTransition {
  /** Source state */
  from: string;

  /** Target state */
  to: string;

  /** Tool that triggers this transition (if any) */
  trigger?: {
    type: 'tool';
    toolName: string;
  };

  /** Custom condition for this transition */
  condition?: (context: WorkflowContext) => boolean;

  /** Is this transition automatic (no user interaction)? */
  automatic?: boolean;
}

/**
 * Complete workflow definition
 */
interface WorkflowDefinition<TStates extends string = string> {
  /** Unique identifier for this workflow */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of the workflow's purpose */
  description?: string;

  /** State configurations */
  states: Record<TStates, StateConfig>;

  /** Allowed transitions between states */
  transitions: StateTransition[];

  /** Initial state when workflow starts */
  initialState: TStates;

  /** States that end the workflow */
  terminalStates: TStates[];

  /** Maximum steps before forced termination */
  maxSteps?: number;
}
```

### WorkflowContext

The runtime context available during workflow execution.

```typescript
/**
 * Runtime context for workflow execution
 */
interface WorkflowContext {
  /** Current state */
  currentState: string;

  /** History of state transitions */
  stateHistory: Array<{
    from: string;
    to: string;
    timestamp: Date;
    trigger?: string;
  }>;

  /** All tool results from the conversation */
  toolResults: ToolResult[];

  /** Data collected during the workflow (domain-specific) */
  collectedData: Record<string, unknown>;

  /** The original user goal/prompt */
  initialPrompt: string;

  /** Current step number */
  stepNumber: number;
}
```

### StatefulAgent

The agent instance created from a workflow definition.

```typescript
/**
 * A stateful agent that executes a workflow
 */
interface StatefulAgent {
  /** The workflow definition */
  workflow: WorkflowDefinition;

  /** Generate a response (non-streaming) */
  generate(params: AgentParams): Promise<AgentResult>;

  /** Stream a response */
  stream(params: AgentParams): Promise<StreamResult>;

  /** Get current context */
  getContext(): WorkflowContext;

  /** Resume from a saved state */
  resume(savedContext: WorkflowContext): void;
}

interface AgentParams {
  /** User message or initial prompt */
  prompt?: string;
  messages?: Message[];

  /** Tools available to the agent */
  tools: ToolSet;

  /** Callbacks */
  onStateChange?: (from: string, to: string, context: WorkflowContext) => void;
  onStepFinish?: (step: StepResult) => void;
}
```

---

## Factory Function

### createStatefulAgent

```typescript
// lib/agents/createStatefulAgent.ts

import { ToolLoopAgent, stepCountIs, hasToolCall } from 'ai';

interface CreateStatefulAgentOptions {
  /** Default model if not specified per-state */
  defaultModel?: ModelConfig;

  /** API key for model provider */
  apiKey?: string;

  /** Persist state after each step */
  onPersist?: (context: WorkflowContext) => Promise<void>;
}

export function createStatefulAgent<TStates extends string>(
  workflow: WorkflowDefinition<TStates>,
  allTools: ToolSet,
  options?: CreateStatefulAgentOptions
): StatefulAgent {
  // Derive current state from tool results
  function deriveState(toolResults: ToolResult[]): TStates {
    // Walk through transitions in reverse order (most recent first)
    // Find the latest tool that triggered a transition
    for (const transition of workflow.transitions) {
      if (transition.trigger?.type === 'tool') {
        const hasToolResult = toolResults.some(
          r => r.toolName === transition.trigger!.toolName
        );
        if (hasToolResult) {
          return transition.to as TStates;
        }
      }
    }
    return workflow.initialState;
  }

  // Build the ToolLoopAgent
  const agent = new ToolLoopAgent({
    model: getModel(options?.defaultModel || 'sonnet', options?.apiKey),

    tools: allTools,

    prepareStep: ({ stepNumber, messages, toolResults }) => {
      const currentState = deriveState(toolResults);
      const stateConfig = workflow.states[currentState];

      return {
        model: stateConfig.model
          ? getModel(stateConfig.model, options?.apiKey)
          : undefined,
        activeTools: stateConfig.tools,
        toolChoice: stateConfig.toolChoice,
        instructions: typeof stateConfig.instructions === 'function'
          ? stateConfig.instructions(buildContext(currentState, toolResults, stepNumber))
          : stateConfig.instructions,
      };
    },

    stopWhen: [
      // Stop when we reach a terminal state
      ...workflow.terminalStates.flatMap(state => {
        const stateConfig = workflow.states[state];
        // Find tools that transition TO this terminal state
        const triggerTools = workflow.transitions
          .filter(t => t.to === state && t.trigger?.type === 'tool')
          .map(t => hasToolCall(t.trigger!.toolName));
        return triggerTools;
      }),
      // Safety limit
      stepCountIs(workflow.maxSteps || 50),
    ],

    onStepFinish: async ({ stepNumber, toolCalls, toolResults }) => {
      const context = buildContext(
        deriveState(toolResults),
        toolResults,
        stepNumber
      );

      if (options?.onPersist) {
        await options.onPersist(context);
      }
    },
  });

  return {
    workflow,
    generate: (params) => agent.generate(params),
    stream: (params) => agent.stream(params),
    getContext: () => { /* ... */ },
    resume: (savedContext) => { /* ... */ },
  };
}
```

---

## Usage Example (Generic)

```typescript
// A simple research workflow (not fitness-specific)

const researchWorkflow: WorkflowDefinition<'CLARIFY' | 'SEARCH' | 'SYNTHESIZE' | 'PRESENT'> = {
  id: 'research',
  name: 'Research Assistant',
  states: {
    CLARIFY: {
      name: 'Clarify Question',
      tools: ['askClarification', 'clarificationComplete'],
      instructions: 'Ask clarifying questions about the research topic.',
    },
    SEARCH: {
      name: 'Search',
      tools: ['webSearch', 'searchComplete'],
      model: 'haiku', // Fast model for search orchestration
      instructions: 'Search for relevant information.',
    },
    SYNTHESIZE: {
      name: 'Synthesize',
      tools: ['synthesize'],
      model: 'sonnet', // Reasoning model for synthesis
      toolChoice: 'required',
      instructions: 'Synthesize findings into a coherent answer.',
    },
    PRESENT: {
      name: 'Present',
      tools: ['refine', 'done'],
      instructions: 'Present the answer and handle follow-up questions.',
    },
  },
  transitions: [
    { from: 'CLARIFY', to: 'SEARCH', trigger: { type: 'tool', toolName: 'clarificationComplete' } },
    { from: 'SEARCH', to: 'SYNTHESIZE', trigger: { type: 'tool', toolName: 'searchComplete' } },
    { from: 'SYNTHESIZE', to: 'PRESENT', trigger: { type: 'tool', toolName: 'synthesize' } },
    { from: 'PRESENT', to: 'SEARCH', trigger: { type: 'tool', toolName: 'refine' } }, // Loop back
  ],
  initialState: 'CLARIFY',
  terminalStates: ['PRESENT'], // Ends when 'done' tool is called
  maxSteps: 30,
};

const agent = createStatefulAgent(researchWorkflow, researchTools);
const result = await agent.generate({ prompt: "What caused the 2008 financial crisis?" });
```

---

## State Persistence

The infrastructure supports persisting workflow state for:
- Resuming interrupted sessions
- Audit trails
- Debugging

```typescript
interface PersistedWorkflowState {
  workflowId: string;
  sessionId: string;
  currentState: string;
  stateHistory: StateTransition[];
  collectedData: Record<string, unknown>;
  messages: Message[]; // For resume
  createdAt: Date;
  updatedAt: Date;
}
```

This can be stored in:
- The existing `Chat` table (add `workflowState: json` column)
- A new `WorkflowSession` table
- Derived from `Message` history (stateless approach)

**Recommendation:** Start with deriving from messages (stateless), add explicit persistence if needed.

---

## UI Components

### StateIndicator

Shows the user where they are in the workflow.

```tsx
// components/agents/StateIndicator.tsx

interface StateIndicatorProps {
  workflow: WorkflowDefinition;
  currentState: string;
  stateHistory: StateTransition[];
}

export function StateIndicator({ workflow, currentState, stateHistory }: StateIndicatorProps) {
  // Filter out hidden states
  const visibleStates = Object.entries(workflow.states)
    .filter(([_, config]) => !config.hidden)
    .map(([id, config]) => ({ id, name: config.name }));

  return (
    <div className="flex items-center gap-2">
      {visibleStates.map((state, index) => (
        <React.Fragment key={state.id}>
          {index > 0 && <span className="text-muted-foreground">→</span>}
          <StateChip
            name={state.name}
            isActive={state.id === currentState}
            isComplete={stateHistory.some(t => t.from === state.id)}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
```

---

## Integration with Existing Systems

### Chat API

The `createStatefulAgent` integrates with the existing chat API pattern:

```typescript
// app/api/chat+api.ts

export async function POST(request: Request) {
  const { messages, workflowId } = await request.json();

  // Get workflow definition (could be from registry)
  const workflow = getWorkflow(workflowId);
  const tools = getToolsForWorkflow(workflowId);

  const agent = createStatefulAgent(workflow, tools, {
    apiKey: process.env.ANTHROPIC_API_KEY,
    onPersist: async (context) => {
      // Optionally persist state
    },
  });

  const result = await agent.stream({ messages });

  return new Response(result.toDataStream());
}
```

### useChat Hook

The existing `useChat` hook works with stateful agents:

```tsx
const { messages, append } = useChat({
  api: '/api/chat',
  body: { workflowId: 'coaching' }, // Specify which workflow
});
```

---

## Directory Structure

```
ai-chat-app/
├── lib/
│   └── agents/
│       ├── types.ts              # Core type definitions
│       ├── createStatefulAgent.ts # Factory function
│       ├── deriveState.ts        # State derivation logic
│       ├── models.ts             # Model configuration helpers
│       └── index.ts              # Barrel exports
├── components/
│   └── agents/
│       ├── StateIndicator.tsx    # State progress UI
│       └── index.ts
└── docs/
    └── plans/
        └── stateful-agents.md    # This document
```

---

## What This Enables for Wally

With this infrastructure, Wally can define its coaching workflow declaratively:

```typescript
// wally/lib/coaching/workflow.ts

import { WorkflowDefinition } from 'ai-chat-app/lib/agents';

export const coachingWorkflow: WorkflowDefinition<CoachingState> = {
  id: 'coaching',
  name: 'Fitness Coaching',
  states: {
    GOAL_CAPTURE: { /* Wally-specific config */ },
    ANALYST: { /* Wally-specific config */ },
    INTAKE: { /* Wally-specific config */ },
    SAFETY: { hidden: true, /* ... */ },
    PLAN: { /* Wally-specific config */ },
    PRESENT: { /* Wally-specific config */ },
  },
  // ... transitions, etc.
};
```

And use the shared infrastructure:

```typescript
// wally/app/api/chat+api.ts

import { createStatefulAgent } from 'ai-chat-app/lib/agents';
import { coachingWorkflow } from '../../lib/coaching/workflow';
import { coachingTools } from '../../lib/coaching/tools';

const agent = createStatefulAgent(coachingWorkflow, coachingTools);
```

---

## Open Questions

1. **How to handle workflows that need to call external APIs during state transitions?**
   - E.g., SAFETY state might need to call a medical database

2. **Should state derivation be push (explicit transition tools) or pull (analyze all tool results)?**
   - Current design uses pull (analyze tool results)
   - Could use push (explicit `transitionTo` tool)

3. **How to handle branching workflows (multiple paths from one state)?**
   - E.g., SAFETY could go to PLAN or back to INTAKE

4. **Should the workflow definition include the tool definitions, or are they separate?**
   - Current: separate (tools passed to `createStatefulAgent`)
   - Alternative: tools defined inline in state config

---

## Next Steps

1. **Implement core types** (`lib/agents/types.ts`)
2. **Implement `createStatefulAgent`** with basic state derivation
3. **Test with a simple workflow** (not coaching, something generic)
4. **Integrate with existing chat API**
5. **Build `StateIndicator` component**
6. **Hand off to Wally** for coaching-specific implementation
