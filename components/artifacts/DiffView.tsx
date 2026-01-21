/**
 * DiffView - Word-level diff visualization between document versions
 *
 * Uses the diff package to compute word-level differences and renders
 * them with green (additions) and red (deletions) highlighting.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { diffWords, type Change } from 'diff';
import { colors, fontSize, spacing } from '../theme';

interface DiffViewProps {
  oldContent: string;
  newContent: string;
  kind: 'text' | 'code';
}

export function DiffView({ oldContent, newContent, kind }: DiffViewProps) {
  const changes = useMemo(() => {
    return diffWords(oldContent, newContent);
  }, [oldContent, newContent]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={[styles.content, kind === 'code' && styles.codeContent]}>
        {changes.map((change, index) => (
          <DiffSegment key={index} change={change} kind={kind} />
        ))}
      </View>
    </ScrollView>
  );
}

interface DiffSegmentProps {
  change: Change;
  kind: 'text' | 'code';
}

function DiffSegment({ change, kind }: DiffSegmentProps) {
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
              style={[
                styles.text,
                kind === 'code' && styles.codeText,
                isAddition && styles.addition,
                isDeletion && styles.deletion,
              ]}
            >
              {line}
            </Text>
            {showNewline && <Text style={styles.newline}>{'\n'}</Text>}
          </React.Fragment>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  codeContent: {
    backgroundColor: colors.code.background,
    padding: spacing.md,
    borderRadius: 8,
  },
  text: {
    fontSize: fontSize.base,
    color: colors.text.primary,
    lineHeight: 24,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
  },
  newline: {
    width: '100%',
    height: 0,
  },
  addition: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)', // Green with opacity
    color: colors.accent.success,
  },
  deletion: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)', // Red with opacity
    color: colors.accent.error,
    textDecorationLine: 'line-through',
  },
});
