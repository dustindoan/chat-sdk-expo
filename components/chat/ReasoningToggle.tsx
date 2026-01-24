import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { colors } from '@/lib/theme';

interface ReasoningToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ReasoningToggle({ enabled, onToggle, disabled }: ReasoningToggleProps) {
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
            color={disabled ? colors.tertiary : enabled ? colors.primary : colors.mutedForeground}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <Text>{enabled ? 'Disable thinking' : 'Enable thinking'}</Text>
      </TooltipContent>
    </Tooltip>
  );
}
