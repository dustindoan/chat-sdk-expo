import React, { memo, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';

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
  // Extract code blocks (complete and streaming/partial)
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
  const mutedForegroundStyle = useResolveClassNames('text-muted-foreground');

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <View key={`list-${elements.length}`} className="my-2">
          {listItems.map((item, i) => (
            <View key={i} className="my-0.5 flex-row">
              <Text
                className="mr-2 text-sm"
                style={{ color: mutedForegroundStyle.color as string }}
              >
                •
              </Text>
              <Text className="flex-1 text-base leading-6 text-foreground">
                {renderInlineMarkdown(item)}
              </Text>
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
        <Text key={i} className="mb-1 mt-2 text-lg font-semibold text-foreground">
          {renderInlineMarkdown(line.slice(4))}
        </Text>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <Text key={i} className="mb-2 mt-3 text-xl font-semibold text-foreground">
          {renderInlineMarkdown(line.slice(3))}
        </Text>
      );
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <Text key={i} className="mb-2 mt-3 text-2xl font-bold text-foreground">
          {renderInlineMarkdown(line.slice(2))}
        </Text>
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
      elements.push(<View key={i} className="h-2" />);
    }
    // Regular paragraph
    else {
      flushList();
      elements.push(
        <Text key={i} className="my-0.5 text-base leading-6 text-foreground">
          {renderInlineMarkdown(line)}
        </Text>
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
      parts.push(
        <Text key={key++} className="font-bold text-foreground">
          {boldMatch[1]}
        </Text>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^[*_](.+?)[*_]/);
    if (italicMatch && !remaining.startsWith('**')) {
      parts.push(
        <Text key={key++} className="italic text-foreground">
          {italicMatch[1]}
        </Text>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <Text
          key={key++}
          className="rounded bg-subtle px-1 text-sm text-syntax-normal"
          style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
        >
          {codeMatch[1]}
        </Text>
      );
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
  const mutedForegroundStyle = useResolveClassNames('text-muted-foreground');
  const tertiaryStyle = useResolveClassNames('text-tertiary');

  const lines = useMemo(() => {
    const result = code.split('\n');
    // Remove trailing empty line if present
    if (result[result.length - 1] === '') {
      result.pop();
    }
    return result;
  }, [code]);

  return (
    <View className="my-3 overflow-hidden rounded-xl border border-subtle bg-subtle">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-subtle-border bg-secondary px-3 py-2">
        <View className="flex-row items-center gap-2">
          <Feather name="file" size={14} color={mutedForegroundStyle.color as string} />
          <Text
            className="text-sm"
            style={{ color: mutedForegroundStyle.color as string }}
          >
            {language}
          </Text>
        </View>
        <Pressable
          className={`p-1 ${isStreaming ? 'opacity-50' : ''}`}
          style={Platform.OS === 'web' ? ({ cursor: isStreaming ? 'default' : 'pointer' } as any) : undefined}
          onPress={() => onCopy?.(code)}
          disabled={isStreaming}
        >
          <Feather name="copy" size={14} color={tertiaryStyle.color as string} />
        </Pressable>
      </View>

      {/* Content */}
      <View className="flex-row bg-subtle">
        {/* Line numbers */}
        <View className="min-w-[40px] items-end border-r border-subtle-border bg-secondary px-2 py-3">
          {lines.map((_, i) => (
            <Text
              key={i}
              className="text-[13px] leading-5 text-tertiary"
              style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
            >
              {i + 1}
            </Text>
          ))}
        </View>

        {/* Code */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 px-3 py-3">
          <View>
            {lines.map((line, i) => (
              <Text
                key={i}
                className="text-[13px] leading-5 text-syntax-normal"
                style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
              >
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

  // Map token types to Tailwind color classes
  const tokenColorClass = {
    keyword: 'text-syntax-keyword',
    string: 'text-syntax-string',
    comment: 'text-syntax-comment',
    number: 'text-syntax-number',
    normal: 'text-syntax-normal',
  };

  return tokens.map((token, i) => (
    <Text
      key={i}
      className={`text-[13px] leading-5 ${tokenColorClass[token.type]}`}
      style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
    >
      {token.text}
    </Text>
  ));
}
