import React, { memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

interface SimpleMarkdownProps {
  text: string;
  onCopyCode?: (code: string) => void;
}

/**
 * Custom markdown renderer optimized for streaming chat messages.
 * Handles code blocks (with streaming support), headers, lists, and inline formatting.
 * Much faster than full AST parsers like markdown-it.
 */
export const SimpleMarkdown = memo(function SimpleMarkdown({ text, onCopyCode }: SimpleMarkdownProps) {
  // First, extract code blocks (complete and streaming/partial)
  const parts = extractCodeBlocks(text);

  return (
    <View>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <MarkdownText key={i} text={part.content} />;
        }
        // Code block (complete or streaming)
        return (
          <CodeBlock
            key={i}
            code={part.content}
            language={part.language || 'text'}
            isStreaming={part.type === 'code-streaming'}
            onCopy={onCopyCode}
          />
        );
      })}
    </View>
  );
});

// Extract code blocks from text, handling both complete and partial (streaming) blocks
function extractCodeBlocks(text: string) {
  const parts: Array<{
    type: 'text' | 'code' | 'code-streaming';
    content: string;
    language?: string;
  }> = [];

  // Match complete code blocks: ```lang\n...\n```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      content: match[2],
      language: match[1] || 'text',
    });
    lastIndex = match.index + match[0].length;
  }

  // Check for partial (streaming) code block at the end
  const remaining = text.slice(lastIndex);
  const partialMatch = remaining.match(/```(\w+)?\n([\s\S]*)$/);

  if (partialMatch) {
    // Add text before the partial code block
    const textBeforePartial = remaining.slice(0, partialMatch.index);
    if (textBeforePartial) {
      parts.push({ type: 'text', content: textBeforePartial });
    }
    parts.push({
      type: 'code-streaming',
      content: partialMatch[2],
      language: partialMatch[1] || 'text',
    });
  } else if (remaining) {
    parts.push({ type: 'text', content: remaining });
  }

  return parts;
}

// Render markdown text (without code blocks)
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <View key={`list-${elements.length}`} style={styles.list}>
          {listItems.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{renderInlineMarkdown(item)}</Text>
            </View>
          ))}
        </View>
      );
      listItems = [];
    }
    inList = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <Text key={i} style={styles.h3}>{renderInlineMarkdown(line.slice(4))}</Text>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <Text key={i} style={styles.h2}>{renderInlineMarkdown(line.slice(3))}</Text>
      );
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <Text key={i} style={styles.h1}>{renderInlineMarkdown(line.slice(2))}</Text>
      );
    }
    // List items (- or *)
    else if (line.match(/^[-*]\s/)) {
      inList = true;
      listItems.push(line.slice(2));
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      inList = true;
      listItems.push(line.replace(/^\d+\.\s/, ''));
    }
    // Empty line
    else if (line.trim() === '') {
      flushList();
      elements.push(<View key={i} style={styles.spacer} />);
    }
    // Regular paragraph
    else {
      flushList();
      elements.push(
        <Text key={i} style={styles.paragraph}>{renderInlineMarkdown(line)}</Text>
      );
    }
  }

  flushList();
  return <>{elements}</>;
}

// Render inline markdown (bold, italic, inline code)
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<Text key={key++} style={styles.bold}>{boldMatch[1]}</Text>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^[*_](.+?)[*_]/);
    if (italicMatch && !remaining.startsWith('**')) {
      parts.push(<Text key={key++} style={styles.italic}>{italicMatch[1]}</Text>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(<Text key={key++} style={styles.inlineCode}>{codeMatch[1]}</Text>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Regular text until next special char
    const nextSpecial = remaining.search(/[*_`]/);
    if (nextSpecial === -1) {
      parts.push(<Text key={key++}>{remaining}</Text>);
      break;
    } else if (nextSpecial === 0) {
      // Special char not matched, treat as regular
      parts.push(<Text key={key++}>{remaining[0]}</Text>);
      remaining = remaining.slice(1);
    } else {
      parts.push(<Text key={key++}>{remaining.slice(0, nextSpecial)}</Text>);
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// Code block component with syntax highlighting
function CodeBlock({
  code,
  language,
  isStreaming,
  onCopy,
}: {
  code: string;
  language: string;
  isStreaming?: boolean;
  onCopy?: (code: string) => void;
}) {
  const lines = code.split('\n');
  // Remove trailing empty line if present
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  return (
    <View style={styles.codeBlockCard}>
      <View style={styles.codeBlockHeader}>
        <View style={styles.codeBlockHeaderLeft}>
          <Feather name="file" size={14} color={colors.text.secondary} />
          <Text style={styles.codeBlockTitle}>{language}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.codeBlockAction,
            isStreaming && styles.codeBlockActionDisabled,
            Platform.OS === 'web' && ({ cursor: isStreaming ? 'default' : 'pointer' } as any),
          ]}
          onPress={() => onCopy?.(code)}
          disabled={isStreaming}
        >
          <Feather name="copy" size={14} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>
      <View style={styles.codeBlockContent}>
        <View style={styles.lineNumbers}>
          {lines.map((_, i) => (
            <Text key={i} style={styles.lineNumber}>{i + 1}</Text>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeScrollView}>
          <View>
            {lines.map((line, i) => (
              <Text key={i} style={styles.codeLine}>
                {highlightLine(line)}
              </Text>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// Basic syntax highlighting
function highlightLine(line: string): React.ReactNode {
  const keywords = [
    'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
    'class', 'import', 'export', 'from', 'def', 'async', 'await', 'try', 'catch',
    'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'print',
    'interface', 'type', 'extends', 'implements', 'public', 'private', 'protected',
  ];

  const tokens: Array<{ type: 'keyword' | 'string' | 'comment' | 'number' | 'normal'; text: string }> = [];
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
      token.type === 'keyword' ? styles.syntaxKeyword
      : token.type === 'string' ? styles.syntaxString
      : token.type === 'comment' ? styles.syntaxComment
      : token.type === 'number' ? styles.syntaxNumber
      : styles.codeLine;

    return <Text key={i} style={style}>{token.text}</Text>;
  });
}

const styles = StyleSheet.create({
  // Text styles
  paragraph: {
    fontSize: fontSize.base,
    lineHeight: 24,
    color: colors.text.primary,
    marginVertical: 2,
  },
  h1: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  h2: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  h3: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  bold: {
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  italic: {
    fontStyle: 'italic',
    color: colors.text.primary,
  },
  inlineCode: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 4,
    borderRadius: borderRadius.sm,
    color: colors.code.text,
    fontSize: fontSize.sm,
  },

  // List styles
  list: {
    marginVertical: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  bullet: {
    color: colors.text.secondary,
    marginRight: spacing.sm,
    fontSize: fontSize.base,
  },
  listText: {
    flex: 1,
    fontSize: fontSize.base,
    lineHeight: 24,
    color: colors.text.primary,
  },
  spacer: {
    height: spacing.sm,
  },

  // Code block styles
  codeBlockCard: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginVertical: spacing.md,
    overflow: 'hidden',
  },
  codeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  codeBlockHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  codeBlockTitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  codeBlockAction: {
    padding: spacing.xs,
  },
  codeBlockActionDisabled: {
    opacity: 0.5,
  },
  codeBlockContent: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
  },
  lineNumbers: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRightWidth: 1,
    borderRightColor: colors.border.subtle,
    minWidth: 40,
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  codeLine: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 13,
    lineHeight: 20,
    color: colors.code.text,
  },

  // Syntax highlighting
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
