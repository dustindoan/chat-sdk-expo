/**
 * Stateful Agents
 *
 * Infrastructure for building multi-state agent workflows.
 *
 * @example
 * ```typescript
 * import { createStatefulAgent, WorkflowDefinition } from '@/lib/agents';
 *
 * const workflow: WorkflowDefinition<'CLARIFY' | 'SEARCH' | 'DONE'> = {
 *   id: 'research',
 *   name: 'Research Assistant',
 *   states: { ... },
 *   transitions: [ ... ],
 *   initialState: 'CLARIFY',
 *   terminalStates: ['DONE'],
 * };
 *
 * const agent = createStatefulAgent(workflow, tools);
 * const result = await agent.generate({ prompt: 'What is quantum computing?' });
 * ```
 */

// Types
export type {
  // Model
  ModelShorthand,
  ModelConfig,
  // Context
  StateTransitionRecord,
  WorkflowContext,
  // State
  ToolChoiceConfig,
  StateConfig,
  // Transitions
  TransitionTrigger,
  StateTransition,
  // Workflow
  WorkflowDefinition,
  // Agent
  AgentCallParams,
  AgentResult,
  StatefulAgent,
  // Factory
  CreateStatefulAgentOptions,
  // Persistence
  PersistedWorkflowState,
} from './types';

// Factory
export { createStatefulAgent } from './createStatefulAgent';

// Utilities
export {
  deriveState,
  buildStateHistory,
  isWorkflowComplete,
  getAvailableTransitions,
} from './deriveState';
export { getModel, getModelId } from './models';

// Registry
export {
  workflowRegistry,
  getWorkflow,
  getAvailableWorkflows,
  isValidWorkflow,
} from './registry';
export type { RegisteredWorkflow } from './registry';
