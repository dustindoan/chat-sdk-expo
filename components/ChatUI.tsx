/**
 * ChatUI - Pre-styled, dark-themed chat interface
 * Adapted from expo-gen-ui to work with @ai-sdk/react useChat hook
 */
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { Feather } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { colors, spacing, borderRadius, fontSize, fontWeight } from "./theme";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatUIProps {
  /** API endpoint for chat */
  api: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Welcome message when no messages */
  welcomeMessage?: string;
  /** Welcome subtitle */
  welcomeSubtitle?: string;
  /** Model name to display */
  modelName?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ChatUI({
  api,
  placeholder = "Send a message...",
  welcomeMessage = "Hello there!",
  welcomeSubtitle = "How can I help you today?",
  modelName = "Claude",
}: ChatUIProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Get safe area insets and header height for keyboard offset
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  // Debug: log values on Android
  useEffect(() => {
    if (Platform.OS === "android") {
      console.log("DEBUG keyboard offset values:", {
        headerHeight,
        insetsTop: insets.top,
        insetsBottom: insets.bottom,
        headerMinusTop: headerHeight - insets.top,
      });
    }
  }, [headerHeight, insets]);

  // Set body background color on web
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.body.style.backgroundColor = colors.background.primary;
      document.documentElement.style.backgroundColor = colors.background.primary;
    }
  }, []);

  // Local state for input (works better with RN TextInput than useChat's input)
  const [localInput, setLocalInput] = useState("");

  // Chat state using @ai-sdk/react
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api,
      fetch: expoFetch as unknown as typeof globalThis.fetch,
    }),
    // Throttle UI updates to every 50ms to ensure streaming updates are visible
    // without overwhelming React Native's rendering
    experimental_throttle: 50,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (localInput?.trim() && !isLoading) {
      sendMessage({ text: localInput.trim() });
      setLocalInput("");
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior="padding"
      // iOS: offset by header height (useHeaderHeight works correctly)
      // Android: useHeaderHeight has a bug that returns inflated values (possibly multiplied by pixel ratio)
      // so we manually calculate: standard Material header (56) + status bar (insets.top)
      keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 56 + insets.top}
    >
      {/* Main content */}
      <View style={s.mainContent}>
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={s.messagesContainer}
          contentContainerStyle={s.messagesContent}
        >
          {messages.length === 0 ? (
            <WelcomeMessage title={welcomeMessage} subtitle={welcomeSubtitle} />
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={isLoading && index === messages.length - 1 && message.role === "assistant"}
              />
            ))
          )}

          {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent.primary} />
              <Text style={s.loadingText}>Thinking...</Text>
            </View>
          )}

          {error && (
            <View style={s.errorContainer}>
              <Text style={s.errorText}>Error: {error.message}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={s.inputWrapper}>
          <View style={s.inputContainer}>
            <TextInput
              style={[s.input, Platform.OS === "web" && ({ outlineStyle: "none" } as unknown as object)]}
              value={localInput}
              onChangeText={setLocalInput}
              placeholder={placeholder}
              placeholderTextColor={colors.text.tertiary}
              multiline
              blurOnSubmit={false}
              onKeyPress={(e) => {
                if (Platform.OS === "web") {
                  const webEvent = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                  if (webEvent.key === "Enter" && !webEvent.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }
              }}
              editable={!isLoading}
            />
            <View style={s.inputToolbar}>
              {/* Model indicator */}
              <View style={s.modelSelector}>
                <Text style={s.sparkle}>✦</Text>
                <Text style={s.modelText}>{modelName}</Text>
              </View>

              {/* Send button */}
              <TouchableOpacity
                style={[
                  s.sendButton,
                  (!localInput?.trim() || isLoading) && s.sendButtonDisabled,
                  Platform.OS === "web" && ({ cursor: "pointer" } as unknown as object),
                ]}
                onPress={handleSend}
                disabled={!localInput?.trim() || isLoading}
              >
                <Text style={s.sendIcon}>↑</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function WelcomeMessage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={s.welcomeContainer}>
      <Text style={s.welcomeTitle}>{title}</Text>
      <Text style={s.welcomeSubtitle}>{subtitle}</Text>
    </View>
  );
}

function MessageBubble({ message, isStreaming = false }: { message: any; isStreaming?: boolean }) {
  const isUser = message.role === "user";

  // Extract text content from parts or content
  let textContent = "";
  if (message.parts && Array.isArray(message.parts)) {
    textContent = message.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("\n");
  } else if (typeof message.content === "string") {
    textContent = message.content;
  }

  // Extract tool invocations
  const toolParts = message.parts?.filter((p: any) => p.type?.startsWith("tool-")) || [];

  if (isUser) {
    return (
      <View style={s.userMessageRow}>
        <View style={s.userBubble}>
          <Text style={s.userText}>{textContent}</Text>
        </View>
      </View>
    );
  }

  // Always render with Markdown - it handles partial content gracefully
  return (
    <View style={s.assistantMessageRow}>
      <View style={s.assistantContent}>
        {/* Tool invocations */}
        {toolParts.map((part: any, index: number) => (
          <ToolInvocation key={index} part={part} />
        ))}

        {/* Text content with markdown - renders progressively during streaming */}
        {textContent && (
          <Markdown
            style={markdownStyles}
            rules={{
              fence: (node: any) => {
                const language = node.sourceInfo || "text";
                const lines = (node.content as string).split("\n");
                // Remove trailing empty line if present
                if (lines[lines.length - 1] === "") {
                  lines.pop();
                }

                return (
                  <View key={node.key} style={s.codeBlockCard}>
                    <View style={s.codeBlockHeader}>
                      <View style={s.codeBlockHeaderLeft}>
                        <Feather name="file" size={14} color={colors.text.secondary} />
                        <Text style={s.codeBlockTitle}>{language}</Text>
                      </View>
                      <TouchableOpacity style={s.codeBlockAction}>
                        <Feather name="copy" size={14} color={colors.text.tertiary} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.codeBlockContent}>
                      {/* Custom line numbers */}
                      <View style={s.lineNumbers}>
                        {lines.map((_, i) => (
                          <Text key={i} style={s.lineNumber}>
                            {i + 1}
                          </Text>
                        ))}
                      </View>
                      {/* Code content */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.codeScrollView}>
                        <View>
                          {lines.map((line, i) => (
                            <Text key={i} style={s.codeLine}>
                              {line || " "}
                            </Text>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                );
              },
            }}
          >
            {textContent}
          </Markdown>
        )}

        {!isStreaming && (
          <View style={s.messageActions}>
            <TouchableOpacity style={s.actionButton}>
              <Feather name="copy" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionButton}>
              <Feather name="thumbs-up" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionButton}>
              <Feather name="thumbs-down" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function ToolInvocation({ part }: { part: any }) {
  const toolName = part.type?.replace("tool-", "") || "tool";
  const isComplete = part.state === "output-available";
  const isPending = part.state === "input-streaming" || part.state === "input-available";

  return (
    <View style={s.toolInvocation}>
      <View style={s.toolHeader}>
        <Text style={s.toolIcon}>🔧</Text>
        <Text style={s.toolName}>{toolName}</Text>
        {isPending && <ActivityIndicator size="small" color={colors.accent.primary} />}
      </View>
      {part.input && (
        <Text style={s.toolInput}>Input: {JSON.stringify(part.input)}</Text>
      )}
      {isComplete && part.output && (
        <View style={s.toolOutputContainer}>
          <Text style={s.toolOutput}>{JSON.stringify(part.output, null, 2)}</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MARKDOWN STYLES
// ============================================================================

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.text.primary,
    fontSize: fontSize.base,
    lineHeight: 24,
  },
  heading1: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  heading2: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  heading3: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  paragraph: {
    marginVertical: spacing.xs,
  },
  strong: {
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  em: {
    fontStyle: "italic",
    color: colors.text.primary,
  },
  code_inline: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    color: colors.code.text,
    fontSize: fontSize.sm,
  },
  bullet_list: {
    marginVertical: spacing.sm,
  },
  ordered_list: {
    marginVertical: spacing.sm,
  },
  list_item: {
    flexDirection: "row",
    marginVertical: spacing.xs,
  },
  bullet_list_icon: {
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  ordered_list_icon: {
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  link: {
    color: colors.accent.primary,
    textDecorationLine: "underline",
  },
  blockquote: {
    backgroundColor: colors.background.secondary,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    marginVertical: spacing.sm,
  },
  hr: {
    backgroundColor: colors.border.default,
    height: 1,
    marginVertical: spacing.md,
  },
});

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

// Dimensions used for input area styling
const SEND_BUTTON_HEIGHT = 36;
const INPUT_TOOLBAR_PADDING_BOTTOM = spacing.sm; // 8
const INPUT_WRAPPER_PADDING_BOTTOM = spacing.lg; // 16

// ============================================================================
// COMPONENT STYLES
// ============================================================================

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    overflow: "hidden",
  } as ViewStyle,

  // Main content
  mainContent: {
    flex: 1,
    flexDirection: "column",
    overflow: "hidden",
  },

  // Messages
  messagesContainer: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background.primary,
  },
  messagesContent: {
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },

  // Welcome
  welcomeContainer: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: spacing.xl,
  },
  welcomeTitle: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: fontSize.lg,
    color: colors.text.secondary,
  },

  // User messages
  userMessageRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  userBubble: {
    maxWidth: "70%",
    backgroundColor: colors.message.user.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  userText: {
    fontSize: fontSize.base,
    lineHeight: 22,
    color: colors.message.user.text,
  },

  // Assistant messages
  assistantMessageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  assistantContent: {
    flex: 1,
    maxWidth: "90%",
  },
  messageActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    padding: spacing.xs,
  },

  // Streaming text (plain text during streaming for performance)
  streamingText: {
    fontSize: fontSize.base,
    lineHeight: 24,
    color: colors.text.primary,
  },

  // Tool invocations
  toolInvocation: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  toolHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  toolIcon: {
    fontSize: fontSize.base,
  },
  toolName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.accent.primary,
  },
  toolInput: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  toolOutputContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  toolOutput: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    fontSize: fontSize.xs,
    color: colors.text.primary,
  },

  // Loading
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },

  // Error
  errorContainer: {
    backgroundColor: colors.accent.error + "20",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.accent.error,
  },

  // Input
  inputWrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: INPUT_WRAPPER_PADDING_BOTTOM,
  },
  inputContainer: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    fontSize: fontSize.base,
    color: colors.text.primary,
  },
  inputToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: INPUT_TOOLBAR_PADDING_BOTTOM,
    gap: spacing.xs,
  },
  modelSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flex: 1,
  },
  sparkle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  modelText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  sendButton: {
    width: SEND_BUTTON_HEIGHT,
    height: SEND_BUTTON_HEIGHT,
    borderRadius: SEND_BUTTON_HEIGHT / 2,
    backgroundColor: colors.accent.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.secondary,
  },
  sendIcon: {
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
  },

  // Code blocks
  codeBlockCard: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginVertical: spacing.md,
    overflow: "hidden",
  },
  codeBlockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  codeBlockHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  codeBlockTitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  codeBlockAction: {
    padding: spacing.xs,
  },
  codeBlockContent: {
    flexDirection: "row",
    backgroundColor: colors.background.tertiary,
  },
  lineNumbers: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRightWidth: 1,
    borderRightColor: colors.border.subtle,
    minWidth: 40,
    alignItems: "flex-end",
  },
  lineNumber: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
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
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    fontSize: 13,
    lineHeight: 20,
    color: colors.code.text,
  },
});

ChatUI.displayName = "ChatUI";
