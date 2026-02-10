import React from 'react';
import { getToolComponent, Confirmation, ConfirmationApproved, ConfirmationDenied } from './tools';
import type { ToolProps } from './types';
import type { ToolState } from './tools/types';

/**
 * Tool component
 * Routes tool invocations to their appropriate UI component
 * based on the tool registry
 *
 * Handles tool approval flow:
 * - approval-requested: Shows Confirmation with Approve/Deny buttons
 * - approval-responded: Shows ConfirmationApproved briefly, then the tool result
 * - output-denied: Shows ConfirmationDenied
 */
export function Tool({ part, onApprovalResponse }: ToolProps) {
  const toolName = part.toolName || part.type?.replace('tool-', '') || 'unknown';
  const toolCallId = part.toolCallId || 'unknown';

  // Map the part state to our ToolState type
  const state: ToolState = part.state || 'call';

  // Support both new format (args/result) and legacy format (input/output)
  const args = part.args || part.input;
  const rawResult = part.result || part.output;

  // AI SDK v6 wraps tool results as { type: "json", value: { ... } } when state is
  // "output-available". Unwrap to give tool components direct access to the result data.
  const result =
    rawResult && typeof rawResult === 'object' && 'type' in rawResult && 'value' in rawResult
      ? (rawResult as { type: string; value: unknown }).value
      : rawResult;

  // Handle approval states
  if (state === 'approval-requested') {
    return (
      <Confirmation
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
      <ConfirmationDenied
        toolName={toolName}
        approval={part.approval}
      />
    );
  }

  // For approval-responded, check if it was approved or denied
  // Show appropriate card based on approval status
  if (state === 'approval-responded' && !result) {
    const wasApproved = part.approval?.approved !== false;
    if (wasApproved) {
      return <ConfirmationApproved toolName={toolName} />;
    } else {
      return (
        <ConfirmationDenied
          toolName={toolName}
          approval={part.approval}
        />
      );
    }
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
