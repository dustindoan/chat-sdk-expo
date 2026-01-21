/**
 * CodeContent Component
 *
 * Renders code artifact content with syntax highlighting.
 * Used inside the artifact panel for code documents.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import type { ArtifactContentProps } from '../../lib/artifacts/types';

/**
 * CodeContent component
 * Renders syntax-highlighted code with line numbers
 */
export const CodeContent = memo(function CodeContent({
  content,
  status,
  language = 'text',
}: ArtifactContentProps) {
  const isStreaming = status === 'streaming';
  const displayContent = content + (isStreaming ? '\u258C' : '');
  const lines = displayContent.split('\n');

  // Remove trailing empty line if present and not streaming
  if (!isStreaming && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* Language badge */}
      <View style={styles.languageBadge}>
        <Text style={styles.languageText}>{language}</Text>
      </View>

      {/* Code display */}
      <View style={styles.codeContainer}>
        <View style={styles.lineNumbers}>
          {lines.map((_, i) => (
            <Text key={i} style={styles.lineNumber}>
              {i + 1}
            </Text>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.codeScrollView}
        >
          <View style={styles.codeLines}>
            {lines.map((line, i) => (
              <Text key={i} style={styles.codeLine}>
                {highlightLine(line)}
              </Text>
            ))}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
});

/**
 * Basic syntax highlighting
 */
function highlightLine(line: string): React.ReactNode {
  const keywords = [
    'function',
    'const',
    'let',
    'var',
    'return',
    'if',
    'else',
    'for',
    'while',
    'class',
    'import',
    'export',
    'from',
    'def',
    'async',
    'await',
    'try',
    'catch',
    'throw',
    'new',
    'this',
    'true',
    'false',
    'null',
    'undefined',
    'print',
    'interface',
    'type',
    'extends',
    'implements',
    'public',
    'private',
    'protected',
    'static',
    'readonly',
    'fn',
    'pub',
    'mod',
    'use',
    'struct',
    'enum',
    'impl',
    'trait',
    'self',
    'Self',
    'match',
    'mut',
  ];

  const tokens: Array<{
    type: 'keyword' | 'string' | 'comment' | 'number' | 'normal';
    text: string;
  }> = [];
  let remaining = line;

  while (remaining.length > 0) {
    // Comments
    if (remaining.startsWith('//') || remaining.startsWith('#')) {
      tokens.push({ type: 'comment', text: remaining });
      break;
    }

    // Strings (single, double quotes, backticks)
    const stringMatch = remaining.match(/^(['"`])(?:[^\\]|\\.)*?\1/);
    if (stringMatch) {
      tokens.push({ type: 'string', text: stringMatch[0] });
      remaining = remaining.slice(stringMatch[0].length);
      continue;
    }

    // Numbers
    const numMatch = remaining.match(/^\d+\.?\d*/);
    if (numMatch) {
      tokens.push({ type: 'number', text: numMatch[0] });
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    // Keywords and identifiers
    const wordMatch = remaining.match(/^[a-zA-Z_]\w*/);
    if (wordMatch) {
      const word = wordMatch[0];
      if (keywords.includes(word)) {
        tokens.push({ type: 'keyword', text: word });
      } else {
        tokens.push({ type: 'normal', text: word });
      }
      remaining = remaining.slice(word.length);
      continue;
    }

    // Default: single character
    tokens.push({ type: 'normal', text: remaining[0] });
    remaining = remaining.slice(1);
  }

  if (tokens.length === 0) {
    return ' '; // Empty line
  }

  return tokens.map((token, i) => {
    const style =
      token.type === 'keyword'
        ? styles.syntaxKeyword
        : token.type === 'string'
          ? styles.syntaxString
          : token.type === 'comment'
            ? styles.syntaxComment
            : token.type === 'number'
              ? styles.syntaxNumber
              : styles.codeLine;

    return (
      <Text key={i} style={style}>
        {token.text}
      </Text>
    );
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
  },
  contentContainer: {
    paddingBottom: spacing.xl * 2,
  },
  languageBadge: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  languageText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
  },
  codeContainer: {
    flexDirection: 'row',
  },
  lineNumbers: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRightWidth: 1,
    borderRightColor: colors.border.subtle,
    minWidth: 50,
    alignItems: 'flex-end',
  },
  lineNumber: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 13,
    lineHeight: 20,
    color: colors.text.tertiary,
  },
  codeScrollView: {
    flex: 1,
  },
  codeLines: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  codeLine: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 13,
    lineHeight: 20,
    color: colors.code.text,
  },
  syntaxKeyword: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 13,
    lineHeight: 20,
    color: '#c792ea', // Purple
  },
  syntaxString: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 13,
    lineHeight: 20,
    color: '#c3e88d', // Green
  },
  syntaxComment: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 13,
    lineHeight: 20,
    color: '#546e7a', // Gray
  },
  syntaxNumber: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 13,
    lineHeight: 20,
    color: '#f78c6c', // Orange
  },
});
