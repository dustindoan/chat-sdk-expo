/**
 * VersionFooter - Sticky footer shown when viewing a historical version
 *
 * Provides "Restore this version" and "Back to latest" actions.
 */

import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

interface VersionFooterProps {
  onRestore: () => void;
  onBackToLatest: () => void;
  isRestoring?: boolean;
}

export function VersionFooter({
  onRestore,
  onBackToLatest,
  isRestoring = false,
}: VersionFooterProps) {
  return (
    <View className="gap-2 border-t border-border bg-secondary p-3">
      <Text variant="muted" className="text-center text-sm">
        You are viewing a previous version
      </Text>

      <View className="flex-row justify-center gap-2">
        <Button
          variant="default"
          size="sm"
          onPress={onRestore}
          disabled={isRestoring}
        >
          <Text>{isRestoring ? 'Restoring...' : 'Restore this version'}</Text>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onPress={onBackToLatest}
          disabled={isRestoring}
        >
          <Text>Back to latest</Text>
        </Button>
      </View>
    </View>
  );
}
