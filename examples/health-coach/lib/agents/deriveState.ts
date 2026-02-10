/**
 * State Derivation Utilities
 *
 * Logic for determining the current workflow state from tool results.
 */

import type {
  WorkflowDefinition,
  StateTransitionRecord,
  ToolResult,
} from './types';

/**
 * Derive the current state from tool results and transitions
 *
 * Walks forward through tool results, tracking the current state.
 * Each tool result is matched against transitions from the current state,
 * allowing the same tool name to trigger different transitions from
 * different states (e.g. updateDocument → PLAN from RESPOND,
 * but updateDocument → PRESENT from PLAN).
 *
 * Tools that don't match any transition from the current state are
 * ignored — they're side effects, not state changes.
 *
 * @param workflow - The workflow definition
 * @param toolResults - All tool results from the current round
 * @returns The current state identifier
 */
export function deriveState<TStates extends string>(
  workflow: WorkflowDefinition<TStates>,
  toolResults: ToolResult[],
): TStates {
  let currentState = workflow.initialState;

  for (const toolResult of toolResults) {
    for (const transition of workflow.transitions) {
      if (
        transition.from === currentState &&
        transition.trigger?.type === 'tool' &&
        transition.trigger.toolName === toolResult.toolName
      ) {
        currentState = transition.to as TStates;
        break;
      }
    }
  }

  return currentState;
}

/**
 * Build state history from tool results
 *
 * Creates a chronological list of state transitions based on tool calls.
 */
export function buildStateHistory<TStates extends string>(
  workflow: WorkflowDefinition<TStates>,
  toolResults: ToolResult[]
): StateTransitionRecord[] {
  const history: StateTransitionRecord[] = [];
  let currentState = workflow.initialState as string;

  for (const toolResult of toolResults) {
    // Find transition triggered by this tool
    for (const transition of workflow.transitions) {
      if (
        transition.from === currentState &&
        transition.trigger?.type === 'tool' &&
        transition.trigger.toolName === toolResult.toolName
      ) {
        history.push({
          from: currentState,
          to: transition.to,
          timestamp: new Date(), // Would be better to get from tool result metadata
          trigger: toolResult.toolName,
        });
        currentState = transition.to;
        break;
      }
    }
  }

  return history;
}

/**
 * Check if a workflow has reached a terminal state
 */
export function isWorkflowComplete<TStates extends string>(
  workflow: WorkflowDefinition<TStates>,
  currentState: TStates
): boolean {
  return workflow.terminalStates.includes(currentState);
}

/**
 * Get available transitions from the current state
 */
export function getAvailableTransitions<TStates extends string>(
  workflow: WorkflowDefinition<TStates>,
  currentState: TStates
): Array<{ to: TStates; trigger?: string }> {
  return workflow.transitions
    .filter((t) => t.from === currentState)
    .map((t) => ({
      to: t.to as TStates,
      trigger: t.trigger?.toolName,
    }));
}
