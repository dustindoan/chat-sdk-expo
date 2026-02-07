import React from 'react';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Button } from '../primitives/button';
import { Text } from '../primitives/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';

interface ReasoningToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ReasoningToggle({ enabled, onToggle, disabled }: ReasoningToggleProps) {
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
          accessibilityLabel={enabled ? 'Disable extended thinking' : 'Enable extended thinking'}
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
        >
          <Feather
            name="cpu"
            size={18}
            color={iconColor}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <Text>{enabled ? 'Disable thinking' : 'Enable thinking'}</Text>
      </TooltipContent>
    </Tooltip>
  );
}
