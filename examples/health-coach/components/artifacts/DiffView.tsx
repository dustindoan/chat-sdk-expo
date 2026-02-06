/**
 * DiffView - Word-level diff visualization between document versions
 *
 * Uses the diff package to compute word-level differences and renders
 * them with green (additions) and red (deletions) highlighting.
 */

import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { diffWords, type Change } from 'diff';
import { useResolveClassNames } from 'uniwind';
import { Text } from '@/components/ui/text';

interface DiffViewProps {
  oldContent: string;
  newContent: string;
  kind: 'text' | 'code';
}

export function DiffView({ oldContent, newContent, kind }: DiffViewProps) {
  const successStyle = useResolveClassNames('text-success');
  const destructiveStyle = useResolveClassNames('text-destructive');

  const changes = useMemo(() => {
    return diffWords(oldContent, newContent);
  }, [oldContent, newContent]);

  return (
    <ScrollView
      className="flex-1 bg-card"
      contentContainerStyle={{ padding: 16 }}
    >
      <View className={`flex-row flex-wrap ${kind === 'code' ? 'rounded-lg bg-secondary p-3' : ''}`}>
        {changes.map((change, index) => (
          <DiffSegment
            key={index}
            change={change}
            kind={kind}
            successColor={successStyle.color as string}
            destructiveColor={destructiveStyle.color as string}
          />
        ))}
      </View>
    </ScrollView>
  );
}

interface DiffSegmentProps {
  change: Change;
  kind: 'text' | 'code';
  successColor: string;
  destructiveColor: string;
}

function DiffSegment({ change, kind, successColor, destructiveColor }: DiffSegmentProps) {
  const isAddition = change.added;
  const isDeletion = change.removed;

  // Split into lines and render each line
  const lines = change.value.split('\n');

  return (
    <>
      {lines.map((line, lineIndex) => {
        // Don't render empty string at the end of a split
        if (lineIndex === lines.length - 1 && line === '') {
          return null;
        }

        const showNewline = lineIndex < lines.length - 1;

        return (
          <React.Fragment key={lineIndex}>
            <Text
              className={`text-base leading-6 ${kind === 'code' ? 'font-mono text-sm' : ''}`}
              style={[
                isAddition && { backgroundColor: 'rgba(34, 197, 94, 0.2)', color: successColor },
                isDeletion && { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: destructiveColor, textDecorationLine: 'line-through' },
              ]}
            >
              {line}
            </Text>
            {showNewline && <Text style={{ width: '100%', height: 0 }}>{'\n'}</Text>}
          </React.Fragment>
        );
      })}
    </>
  );
}
