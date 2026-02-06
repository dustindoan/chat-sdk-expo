/**
 * State Derivation Utilities
 *
 * Logic for determining the current workflow state from tool results.
 */

import type {
  WorkflowDefinition,
  WorkflowContext,
  StateTransitionRecord,
  ToolResult,
} from './types';

/**
 * Extract tool names from tool results
 */
function getToolNames(toolResults: ToolResult[]): Set<string> {
  return new Set(toolResults.map((r) => r.toolName));
}

/**
 * Derive the current state from tool results and transitions
 *
 * This walks through the workflow transitions and finds the latest
 * state that has been reached based on which tools have been called.
 *
 * @param workflow - The workflow definition
 * @param toolResults - All tool results from the conversation
 * @param context - Optional partial context for condition evaluation
 * @returns The current state identifier
 */
export function deriveState<TStates extends string>(
  workflow: WorkflowDefinition<TStates>,
  toolResults: ToolResult[],
  context?: Partial<WorkflowContext>
): TStates {
  const toolNames = getToolNames(toolResults);

  // Build a map of state -> tools that lead TO that state
  const stateEntryTools = new Map<TStates, string[]>();

  for (const transition of workflow.transitions) {
    if (transition.trigger?.type === 'tool') {
      const existing = stateEntryTools.get(transition.to as TStates) || [];
      existing.push(transition.trigger.toolName);
      stateEntryTools.set(transition.to as TStates, existing);
    }
  }

  // Walk backwards through tool results to find the most recent state transition
  // This ensures we get the LATEST state, not just any state we've been through
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const toolName = toolResults[i].toolName;

    // Find which state this tool transitions TO
    for (const transition of workflow.transitions) {
      if (transition.trigger?.type === 'tool' && transition.trigger.toolName === toolName) {
        // Check condition if present
        if (transition.condition && context) {
          const fullContext: WorkflowContext = {
            currentState: transition.to,
            stateHistory: [],
            toolResults,
            collectedData: {},
            initialPrompt: '',
            stepNumber: 0,
            messages: [],
            ...context,
          };

          if (!transition.condition(fullContext)) {
            continue;
          }
        }

        return transition.to as TStates;
      }
    }
  }

  // No transitions found, return initial state
  return workflow.initialState;
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
