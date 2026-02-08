/**
 * Workflow Registry
 *
 * Central registry for available workflows. Apps can register workflows
 * that users can activate to change the interaction pattern.
 *
 * Workflows vs Tools:
 * - Tools: Single capabilities the model can invoke (web search, code exec)
 * - Workflows: Multi-step orchestrated processes with state machines
 *
 * Future consideration: Unify tools and workflows into a single "capability"
 * abstraction where workflows are just compound/macro tools.
 */

import type { ToolSet } from 'ai';
import type { WorkflowDefinition } from './types';

// Import example workflows
import { researchWorkflow, researchTools } from './examples/research-assistant';

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
 * Registry of available workflows
 *
 * To add a new workflow:
 * 1. Create workflow definition in lib/agents/examples/
 * 2. Import and register it here
 * 3. The workflow will automatically be available in the UI
 */
export const workflowRegistry: Record<string, RegisteredWorkflow> = {
  research: {
    workflow: researchWorkflow,
    tools: researchTools,
    description: 'Multi-step research that clarifies your question, searches for information, and synthesizes a comprehensive answer',
    icon: 'search',
    label: 'Research',
  },
  // Future workflows for health-coach:
  // coaching: {
  //   workflow: coachingWorkflow,
  //   tools: coachingTools,
  //   description: 'Fitness coaching that captures goals, assesses fitness level, and creates personalized training plans',
  //   icon: 'activity',
  //   label: 'Coaching',
  // },
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
