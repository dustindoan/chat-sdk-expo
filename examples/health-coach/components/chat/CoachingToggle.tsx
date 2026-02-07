import React from 'react';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Button, Text, Tooltip, TooltipContent, TooltipTrigger } from '@chat-sdk-expo/ui/primitives';

interface CoachingToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function CoachingToggle({ enabled, onToggle, disabled }: CoachingToggleProps) {
  // Use useResolveClassNames for icon colors
  const tertiaryStyle = useResolveClassNames('text-tertiary');
  const primaryStyle = useResolveClassNames('text-primary');
  const mutedForegroundStyle = useResolveClassNames('text-muted-foreground');

  // Determine icon color based on state
  const iconColor = disabled
    ? tertiaryStyle.color as string
    : enabled
      ? primaryStyle.color as string
      : mutedForegroundStyle.color as string;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`size-8 rounded-full ${enabled ? 'bg-blue-500/20' : ''}`}
          onPress={onToggle}
          disabled={disabled}
          accessibilityLabel={enabled ? 'Disable coaching mode' : 'Enable coaching mode'}
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
        >
          <Feather
            name="activity"
            size={18}
            color={iconColor}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <Text>{enabled ? 'Disable coaching' : 'Enable coaching'}</Text>
      </TooltipContent>
    </Tooltip>
  );
}
