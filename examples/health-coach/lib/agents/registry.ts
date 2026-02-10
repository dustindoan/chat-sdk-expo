/**
 * Workflow Registry - Health Coach
 *
 * Central registry for available workflows in the Health Coach app.
 * Currently includes:
 * - coaching: Full fitness coaching workflow (goal → plan)
 */

import type { ToolSet } from 'ai';
import type { WorkflowDefinition } from './types';

// Import app-specific workflows
import { coachingWorkflow, coachingTools } from './examples/coaching-workflow';

/**
 * A registered workflow with its tools and metadata
 */
export interface RegisteredWorkflow<TStates extends string = string> {
  /** The workflow definition (states, transitions, etc.) */
  workflow: WorkflowDefinition<TStates>;
  /** Tools available to this workflow */
  tools: ToolSet;
  /** Human-readable description */
  description: string;
  /** Icon name (Feather icon) for UI */
  icon: string;
  /** Short label for toggle button */
  label: string;
}

/**
 * Registry of available workflows for Health Coach
 */
export const workflowRegistry: Record<string, RegisteredWorkflow> = {
  coaching: {
    workflow: coachingWorkflow,
    tools: coachingTools,
    description:
      'Conversational coaching with a living training plan that evolves as you share more',
    icon: 'activity',
    label: 'Coaching',
  },
};

/**
 * Get a workflow by ID
 */
export function getWorkflow(id: string): RegisteredWorkflow | undefined {
  return workflowRegistry[id];
}

/**
 * Get all available workflow IDs
 */
export function getAvailableWorkflows(): string[] {
  return Object.keys(workflowRegistry);
}

/**
 * Check if a workflow ID is valid
 */
export function isValidWorkflow(id: string): boolean {
  return id in workflowRegistry;
}
