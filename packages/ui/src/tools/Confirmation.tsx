import React, { memo } from 'react';
import { View, Platform } from 'react-native';
import { Text } from '../primitives/text';
import { Button } from '../primitives/button';
import { Card, CardContent, CardFooter, CardHeader } from '../primitives/card';
import type { ToolUIProps } from './types';

/**
 * Confirmation component
 * Displays a card prompting user to approve or deny a tool execution
 */
export const Confirmation = memo(function Confirmation({
  toolName,
  args,
  approval,
  onApprovalResponse,
}: ToolUIProps) {
  const handleApprove = () => {
    if (approval?.id && onApprovalResponse) {
      onApprovalResponse({ id: approval.id, approved: true });
    }
  };

  const handleDeny = () => {
    if (approval?.id && onApprovalResponse) {
      onApprovalResponse({
        id: approval.id,
        approved: false,
        reason: `User denied ${toolName} execution`,
      });
    }
  };

  // Format tool name for display
  const displayName = toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  // Get a friendly description based on tool name
  const getToolDescription = () => {
    switch (toolName) {
      case 'weather':
        const city = (args as any)?.city;
        return city
          ? `Look up weather for "${city}"`
          : 'Look up weather at the specified location';
      case 'convertTemperature':
        return 'Convert temperature between Fahrenheit and Celsius';
      case 'createDocument':
        return 'Create a new document';
      case 'updateDocument':
        return 'Update an existing document';
      default:
        return `Execute ${displayName}`;
    }
  };

  return (
    <Card className="my-2 overflow-hidden border-amber-500 py-0">
      {/* Header */}
      <CardHeader className="flex-row items-center gap-2 border-b border-border bg-amber-500/10 px-3 py-3">
        <Text className="text-lg">{'\u26A0\uFE0F'}</Text>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-amber-500">Action Required</Text>
          <Text variant="muted" className="mt-0.5 text-xs">
            {displayName} wants to execute
          </Text>
        </View>
      </CardHeader>

      {/* Description */}
      <CardContent className="py-3">
        <Text className="text-sm leading-5">{getToolDescription()}</Text>

        {/* Show args if present */}
        {args && typeof args === 'object' && Object.keys(args as Record<string, unknown>).length > 0 ? (
          <View className="mt-2">
            <Text variant="muted" className="mb-1 text-xs uppercase tracking-wide">
              Parameters:
            </Text>
            <View className="rounded-md bg-card p-2">
              <Text
                className="text-xs"
                style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
              >
                {JSON.stringify(args, null, 2)}
              </Text>
            </View>
          </View>
        ) : null}
      </CardContent>

      {/* Actions */}
      <CardFooter className="justify-end gap-2 border-t border-border py-3">
        <Button variant="outline" size="sm" onPress={handleDeny}>
          <Text>Deny</Text>
        </Button>
        <Button variant="default" size="sm" onPress={handleApprove}>
          <Text>Allow</Text>
        </Button>
      </CardFooter>
    </Card>
  );
});

/**
 * ConfirmationApproved component
 * Shows a brief confirmation that a tool was approved
 */
export const ConfirmationApproved = memo(function ConfirmationApproved({
  toolName,
}: Pick<ToolUIProps, 'toolName'>) {
  const displayName = toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  return (
    <View className="my-2 flex-row items-center rounded-lg border-l-[3px] border-l-success bg-secondary p-3">
      <Text className="mr-2 text-base">{'\u2705'}</Text>
      <Text className="text-sm font-medium text-green-500">{displayName} approved</Text>
    </View>
  );
});

/**
 * ConfirmationDenied component
 * Shows that a tool execution was denied
 */
export const ConfirmationDenied = memo(function ConfirmationDenied({
  toolName,
  approval,
}: Pick<ToolUIProps, 'toolName' | 'approval'>) {
  const displayName = toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  return (
    <View className="my-2 flex-row items-start rounded-lg border-l-[3px] border-l-destructive bg-secondary p-3">
      <Text className="mr-2 text-base">{'\u274C'}</Text>
      <View className="flex-1">
        <Text className="text-sm font-medium text-red-500">{displayName} was denied</Text>
        {approval?.reason && (
          <Text variant="muted" className="mt-1 text-xs">
            {approval.reason}
          </Text>
        )}
      </View>
    </View>
  );
});
