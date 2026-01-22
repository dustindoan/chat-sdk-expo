import React from 'react';
import { getToolComponent, ToolApprovalCard, ToolApprovedCard, ToolDeniedCard } from './tools';
import type { ToolInvocationProps } from './types';
import type { ToolState } from './tools/types';

/**
 * ToolInvocation component
 * Routes tool invocations to their appropriate UI component
 * based on the tool registry
 *
 * Handles tool approval flow:
 * - approval-requested: Shows ToolApprovalCard with Approve/Deny buttons
 * - approval-responded: Shows ToolApprovedCard briefly, then the tool result
 * - output-denied: Shows ToolDeniedCard
 */
export function ToolInvocation({ part, onApprovalResponse }: ToolInvocationProps) {
  const toolName = part.toolName || part.type?.replace('tool-', '') || 'unknown';
  const toolCallId = part.toolCallId || 'unknown';

  // Map the part state to our ToolState type
  const state: ToolState = part.state || 'call';

  // Support both new format (args/result) and legacy format (input/output)
  const args = part.args || part.input;
  const result = part.result || part.output;

  // Handle approval states
  if (state === 'approval-requested') {
    return (
      <ToolApprovalCard
        toolName={toolName}
        toolCallId={toolCallId}
        state={state}
        args={args}
        approval={part.approval}
        onApprovalResponse={onApprovalResponse}
      />
    );
  }

  if (state === 'output-denied') {
    return (
      <ToolDeniedCard
        toolName={toolName}
        approval={part.approval}
      />
    );
  }

  // For approval-responded, show approved card if we don't have result yet
  // Once result is available, show the normal tool UI
  if (state === 'approval-responded' && !result) {
    return <ToolApprovedCard toolName={toolName} />;
  }

  // Get the appropriate component from the registry for normal states
  const Component = getToolComponent(toolName);

  return (
    <Component
      toolName={toolName}
      toolCallId={toolCallId}
      state={state}
      args={args}
      result={result}
      approval={part.approval}
      onApprovalResponse={onApprovalResponse}
    />
  );
}
