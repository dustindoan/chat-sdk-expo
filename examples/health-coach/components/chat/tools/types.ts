import type { ComponentType } from 'react';

/**
 * Tool execution states from AI SDK v6
 * Note: AI SDK uses 'output-available' for completed tools, not 'result'
 */
export type ToolState =
  | 'partial-call' // Input being generated (streaming args)
  | 'call' // Input complete, tool is executing
  | 'result' // Legacy: Execution complete with result
  | 'output-available' // AI SDK v6: Execution complete with result
  | 'approval-requested' // Tool requires user approval before execution
  | 'approval-responded' // User has responded to approval request
  | 'output-denied'; // User denied tool execution

/**
 * Tool approval data from AI SDK
 */
export interface ToolApproval {
  /** Unique ID for this approval request */
  id: string;
  /** Whether user approved (set after response) */
  approved?: boolean;
  /** Optional reason for denial */
  reason?: string;
}

/**
 * Props passed to tool UI components
 */
export interface ToolUIProps<TArgs = unknown, TResult = unknown> {
  /** Name of the tool being invoked */
  toolName: string;
  /** Unique ID for this tool call */
  toolCallId: string;
  /** Current execution state */
  state: ToolState;
  /** Tool input arguments (may be partial during streaming) */
  args?: TArgs;
  /** Tool execution result (only present when state is 'result') */
  result?: TResult;
  /** Approval data (present when state is approval-related) */
  approval?: ToolApproval;
  /** Callback to respond to approval request */
  onApprovalResponse?: (response: { id: string; approved: boolean; reason?: string }) => void;
}

/**
 * Tool UI component type
 */
export type ToolUIComponent<TArgs = unknown, TResult = unknown> = ComponentType<
  ToolUIProps<TArgs, TResult>
>;

/**
 * Registry mapping tool names to their UI components
 */
export interface ToolUIRegistry {
  [toolName: string]: ToolUIComponent<any, any>;
}
