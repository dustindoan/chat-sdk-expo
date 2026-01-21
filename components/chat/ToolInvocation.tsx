import React from 'react';
import { getToolComponent } from './tools';
import type { ToolInvocationProps } from './types';
import type { ToolState } from './tools/types';

/**
 * ToolInvocation component
 * Routes tool invocations to their appropriate UI component
 * based on the tool registry
 */
export function ToolInvocation({ part }: ToolInvocationProps) {
  const toolName = part.toolName || part.type?.replace('tool-', '') || 'unknown';
  const toolCallId = part.toolCallId || 'unknown';

  // Map the part state to our ToolState type
  const state: ToolState = part.state || 'call';

  // Support both new format (args/result) and legacy format (input/output)
  const args = part.args || part.input;
  const result = part.result || part.output;

  // Get the appropriate component from the registry
  const Component = getToolComponent(toolName);

  return (
    <Component
      toolName={toolName}
      toolCallId={toolCallId}
      state={state}
      args={args}
      result={result}
    />
  );
}
