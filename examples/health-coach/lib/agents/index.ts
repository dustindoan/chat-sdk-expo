/**
 * Stateful Agents - Wally Fitness App
 *
 * Infrastructure for building multi-state agent workflows.
 *
 * @example
 * ```typescript
 * import { createStatefulAgent, getWorkflow } from '@/lib/agents';
 *
 * // Get the coaching workflow from registry
 * const { workflow, tools } = getWorkflow('coaching');
 *
 * // Create an agent instance
 * const agent = createStatefulAgent(workflow, tools, { apiKey });
 *
 * // Run the workflow
 * const result = await agent.generate({ prompt: 'I want to run a 4:25 1500m' });
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

// Coaching workflow (for direct access)
export {
  coachingWorkflow,
  coachingTools,
  type CoachingState,
} from './examples/coaching-workflow';
