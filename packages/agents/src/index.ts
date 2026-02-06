/**
 * @chat-sdk-expo/agents
 *
 * Stateful agent infrastructure for AI chat applications.
 * Built on AI SDK v6's ToolLoopAgent with workflow state machines.
 */

// Core factory
export { createStatefulAgent } from './createStatefulAgent';

// State derivation utilities
export {
  deriveState,
  buildStateHistory,
  isWorkflowComplete,
  getAvailableTransitions,
} from './deriveState';

// Model utilities
export {
  getModel,
  resolveModelId,
  createModelResolver,
  MODEL_SHORTHAND_MAP,
} from './models';

// Types
export type {
  // Core types
  Message,
  ToolResult,
  ModelShorthand,
  ModelConfig,

  // Workflow types
  WorkflowDefinition,
  WorkflowContext,
  StateConfig,
  StateTransition,
  StateTransitionRecord,
  TransitionTrigger,
  ToolChoiceConfig,

  // Agent types
  StatefulAgent,
  AgentCallParams,
  AgentResult,
  CreateStatefulAgentOptions,
  ModelResolver,

  // Persistence types
  PersistedWorkflowState,
} from './types';
