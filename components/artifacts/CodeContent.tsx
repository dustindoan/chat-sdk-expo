/**
 * CodeContent Component
 *
 * Renders code artifact content with syntax highlighting.
 * Used inside the artifact panel for code documents.
 */

import React, { memo } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { syntaxColors } from '@/lib/theme';
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
      className="flex-1 bg-secondary"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={true}
    >
      {/* Language badge */}
      <View className="border-b border-border bg-card px-3 py-2">
        <Text
          className="text-sm text-muted-foreground"
          style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
        >
          {language}
        </Text>
      </View>

      {/* Code display */}
      <View className="flex-row">
        <View className="min-w-[50px] items-end border-r border-border bg-card px-2 py-3">
          {lines.map((_, i) => (
            <Text
              key={i}
              className="text-[13px] leading-5 text-muted-foreground"
              style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
            >
              {i + 1}
            </Text>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
        >
          <View className="px-3 py-3">
            {lines.map((line, i) => (
              <Text
                key={i}
                className="text-[13px] leading-5"
                style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
              >
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

  return tokens.map((token, i) => (
    <Text
      key={i}
      className="text-[13px] leading-5"
      style={{
        fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
        color: syntaxColors[token.type],
      }}
    >
      {token.text}
    </Text>
  ));
}
