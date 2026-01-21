import type { ComponentType } from 'react';

/**
 * Tool execution states from AI SDK v6
 * Note: AI SDK uses 'output-available' for completed tools, not 'result'
 */
export type ToolState =
  | 'partial-call' // Input being generated (streaming args)
  | 'call' // Input complete, tool is executing
  | 'result' // Legacy: Execution complete with result
  | 'output-available'; // AI SDK v6: Execution complete with result

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
