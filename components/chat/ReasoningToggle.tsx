import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ReasoningToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ReasoningToggle({ enabled, onToggle, disabled }: ReasoningToggleProps) {
  return (
    <TouchableOpacity
      className={`size-8 rounded-full items-center justify-center ${
        enabled ? 'bg-blue-500/20' : ''
      } ${disabled ? 'opacity-50' : ''}`}
      style={Platform.OS === 'web' ? ({ cursor: disabled ? 'default' : 'pointer' } as any) : undefined}
      onPress={onToggle}
      disabled={disabled}
      accessibilityLabel={enabled ? 'Disable extended thinking' : 'Enable extended thinking'}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
    >
      <Feather
        name="cpu"
        size={18}
        color={disabled ? '#71717a' : enabled ? '#3b82f6' : '#a1a1aa'}
      />
    </TouchableOpacity>
  );
}
