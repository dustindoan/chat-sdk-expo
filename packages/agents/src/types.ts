/**
 * Stateful Agent Types
 *
 * Core type definitions for building stateful agent workflows.
 * These are domain-agnostic primitives that can be used to build
 * any multi-state agent workflow.
 */

import type { ToolSet, UIMessage, TypedToolResult } from 'ai';
import type { LanguageModelV3 } from '@ai-sdk/provider';

// Re-export for convenience
export type Message = UIMessage;
export type ToolResult = TypedToolResult<ToolSet>;

// =============================================================================
// MODEL CONFIGURATION
// =============================================================================

/**
 * Model shorthand for common models
 * Apps can extend this with their own model shortcuts
 */
export type ModelShorthand = 'haiku' | 'sonnet' | 'opus' | string;

/**
 * Full model configuration
 */
export interface ModelConfig {
  provider: 'anthropic' | 'openai';
  model: string;
}

// =============================================================================
// WORKFLOW CONTEXT
// =============================================================================

/**
 * A record of a state transition
 */
export interface StateTransitionRecord {
  from: string;
  to: string;
  timestamp: Date;
  trigger?: string;
  reason?: string;
}

/**
 * Runtime context available during workflow execution
 */
export interface WorkflowContext {
  /** Current state identifier */
  currentState: string;

  /** History of state transitions */
  stateHistory: StateTransitionRecord[];

  /** All tool results from the conversation */
  toolResults: ToolResult[];

  /** Data collected during the workflow (domain-specific) */
  collectedData: Record<string, unknown>;

  /** The original user goal/prompt */
  initialPrompt: string;

  /** Current step number in the agent loop */
  stepNumber: number;

  /** Full message history */
  messages: Message[];
}

// =============================================================================
// STATE CONFIGURATION
// =============================================================================

/**
 * Tool choice configuration
 */
export type ToolChoiceConfig =
  | 'auto'
  | 'required'
  | 'none'
  | { type: 'tool'; toolName: string };

/**
 * Configuration for a single state in the workflow
 */
export interface StateConfig {
  /** Human-readable name for this state (shown in UI) */
  name: string;

  /** Description of what happens in this state */
  description?: string;

  /** Model to use in this state (overrides workflow default) */
  model?: ModelShorthand | ModelConfig;

  /** Tool names available in this state */
  tools: string[];

  /** Tool choice strategy for this state */
  toolChoice?: ToolChoiceConfig;

  /**
   * System instructions for this state.
   * Can be a static string or a function that receives the current context.
   */
  instructions: string | ((context: WorkflowContext) => string);

  /**
   * Is this state invisible to the user in the UI?
   * Useful for internal states like SAFETY checks.
   */
  hidden?: boolean;

  /**
   * Should this state auto-advance without user input?
   * Useful for states that just run tools and move on.
   */
  automatic?: boolean;
}

// =============================================================================
// TRANSITIONS
// =============================================================================

/**
 * Trigger condition for a state transition
 */
export interface TransitionTrigger {
  /** Trigger when a specific tool is called */
  type: 'tool';
  toolName: string;
}

/**
 * A transition between states
 */
export interface StateTransition {
  /** Source state identifier */
  from: string;

  /** Target state identifier */
  to: string;

  /** Tool that triggers this transition (optional) */
  trigger?: TransitionTrigger;

  /**
   * Custom condition for this transition.
   * If provided, must return true for transition to occur.
   */
  condition?: (context: WorkflowContext) => boolean;

  /**
   * Is this transition automatic (no user interaction needed)?
   * If true, the agent will continue without waiting for user input.
   */
  automatic?: boolean;
}

// =============================================================================
// WORKFLOW DEFINITION
// =============================================================================

/**
 * Complete workflow definition
 *
 * @template TStates - Union type of state identifiers (e.g., 'INTAKE' | 'PLAN')
 */
export interface WorkflowDefinition<TStates extends string = string> {
  /** Unique identifier for this workflow */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of the workflow's purpose */
  description?: string;

  /** State configurations keyed by state identifier */
  states: Record<TStates, StateConfig>;

  /** Allowed transitions between states */
  transitions: StateTransition[];

  /** Initial state when workflow starts */
  initialState: TStates;

  /** States that end the workflow */
  terminalStates: TStates[];

  /** Default model for states that don't specify one */
  defaultModel?: ModelShorthand | ModelConfig;

  /** Maximum steps before forced termination (default: 50) */
  maxSteps?: number;
}

// =============================================================================
// AGENT INTERFACE
// =============================================================================

/**
 * Parameters for agent generate/stream calls
 */
export interface AgentCallParams {
  /** User message or initial prompt */
  prompt?: string;

  /** Message history (alternative to prompt) */
  messages?: Message[];

  /** Callback when state changes */
  onStateChange?: (
    from: string,
    to: string,
    context: WorkflowContext
  ) => void | Promise<void>;

  /** Callback after each step completes */
  onStepFinish?: (context: WorkflowContext) => void | Promise<void>;

  /** Callback when streaming finishes - receives all messages from the stream */
  onFinish?: (messages: Message[]) => void | Promise<void>;
}

/**
 * Result from agent generation
 */
export interface AgentResult {
  /** Final response text */
  text: string;

  /** Tool calls made during generation */
  toolCalls: Array<{
    toolName: string;
    args: Record<string, unknown>;
  }>;

  /** Tool results */
  toolResults: ToolResult[];

  /** Final workflow context */
  context: WorkflowContext;

  /** Whether the workflow reached a terminal state */
  isComplete: boolean;
}

/**
 * A stateful agent instance
 */
export interface StatefulAgent<TStates extends string = string> {
  /** The workflow definition */
  readonly workflow: WorkflowDefinition<TStates>;

  /** Generate a response (non-streaming) */
  generate(params: AgentCallParams): Promise<AgentResult>;

  /** Stream a response (returns a Response for use with fetch-based clients) */
  stream(params: AgentCallParams): Promise<Response>;

  /** Get current workflow context */
  getContext(): WorkflowContext;

  /** Resume from a saved context */
  resume(savedContext: Partial<WorkflowContext>): void;

  /** Reset the agent to initial state */
  reset(): void;
}

// =============================================================================
// FACTORY OPTIONS
// =============================================================================

/**
 * Model resolver function type
 * Apps provide this to map model shorthands to actual model instances
 */
export type ModelResolver = (
  shorthand: ModelShorthand | ModelConfig
) => LanguageModelV3;

/**
 * Options for createStatefulAgent factory
 */
export interface CreateStatefulAgentOptions {
  /** API key for model provider */
  apiKey?: string;

  /** Default model if not specified in workflow or state */
  defaultModel?: ModelShorthand | ModelConfig;

  /** Persist state after each step */
  onPersist?: (context: WorkflowContext) => Promise<void>;

  /** Called when workflow completes */
  onComplete?: (context: WorkflowContext) => Promise<void>;

  /** Custom model resolver (default: Anthropic with common shorthands) */
  resolveModel?: ModelResolver;
}

// =============================================================================
// PERSISTED STATE
// =============================================================================

/**
 * Serializable workflow state for persistence
 */
export interface PersistedWorkflowState {
  workflowId: string;
  sessionId: string;
  currentState: string;
  stateHistory: StateTransitionRecord[];
  collectedData: Record<string, unknown>;
  initialPrompt: string;
  stepNumber: number;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
