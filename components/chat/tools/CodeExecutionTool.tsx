import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { ToolUIProps } from './types';
import type { ExecuteCodeInput, ExecuteCodeResult } from '../../../lib/ai/tools/executeCode';
import {
  executeCode,
  supportsInBrowserExecution,
  type ExecutionResult,
} from '../../../lib/code-execution';

type CodeExecutionToolProps = ToolUIProps<ExecuteCodeInput, ExecuteCodeResult>;

// Language display names and colors
const languageConfig = {
  python: { name: 'Python', color: '#3776ab', icon: '\uD83D\uDC0D' },
  javascript: { name: 'JavaScript', color: '#f7df1e', icon: '\uD83D\uDFE8' },
};

/**
 * CodeExecutionTool component
 *
 * Displays code execution interface with:
 * - Code preview
 * - Execution status
 * - Output display
 * - Error handling
 */
export const CodeExecutionTool = memo(function CodeExecutionTool({
  state,
  args,
  result,
}: CodeExecutionToolProps) {
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showFullCode, setShowFullCode] = useState(false);

  const isLoading = state === 'partial-call' || state === 'call';
  const isApprovalPending = state === 'approval-requested';
  const wasApproved = state === 'approval-responded' || state === 'output-available';
  const wasDenied = state === 'output-denied';

  // Execute code when approval is granted
  useEffect(() => {
    if (wasApproved && args && !executionResult && !isExecuting) {
      setIsExecuting(true);

      executeCode({
        code: args.code,
        language: args.language,
        timeout: 10000,
      })
        .then((result) => {
          setExecutionResult(result);
        })
        .catch((error) => {
          setExecutionResult({
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
            executionTime: 0,
          });
        })
        .finally(() => {
          setIsExecuting(false);
        });
    }
  }, [wasApproved, args, executionResult, isExecuting]);

  const language = args?.language || 'javascript';
  const config = languageConfig[language] || languageConfig.javascript;
  const code = args?.code || '';
  const codeLines = code.split('\n');
  const truncatedCode =
    codeLines.length > 10 ? codeLines.slice(0, 10).join('\n') + '\n...' : code;

  const toggleCodeView = useCallback(() => {
    setShowFullCode((prev) => !prev);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.languageBadge, { backgroundColor: config.color }]}>
          <Text style={styles.languageIcon}>{config.icon}</Text>
          <Text style={styles.languageName}>{config.name}</Text>
        </View>
        <Text style={styles.headerText}>Code Execution</Text>
        {supportsInBrowserExecution() && (
          <View style={styles.browserBadge}>
            <Text style={styles.browserBadgeText}>In-Browser</Text>
          </View>
        )}
      </View>

      {/* Loading state (streaming args) */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Preparing code...</Text>
        </View>
      )}

      {/* Approval pending state */}
      {isApprovalPending && args && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Code to execute:</Text>
          <Pressable onPress={toggleCodeView}>
            <ScrollView
              horizontal
              style={styles.codeContainer}
              contentContainerStyle={styles.codeContent}
            >
              <Text style={styles.codeText}>
                {showFullCode ? code : truncatedCode}
              </Text>
            </ScrollView>
            {codeLines.length > 10 && (
              <Text style={styles.expandText}>
                {showFullCode ? 'Show less' : `Show all ${codeLines.length} lines`}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Denied state */}
      {wasDenied && (
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedIcon}>{'\u26D4'}</Text>
          <Text style={styles.deniedText}>Code execution was denied</Text>
        </View>
      )}

      {/* Executing state */}
      {isExecuting && (
        <View style={styles.executingContainer}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
          <Text style={styles.executingText}>
            Executing {config.name} code...
          </Text>
        </View>
      )}

      {/* Execution result */}
      {executionResult && !isExecuting && (
        <View style={styles.resultSection}>
          {/* Code preview (collapsed) */}
          <Pressable onPress={toggleCodeView} style={styles.codePreviewHeader}>
            <Text style={styles.codePreviewLabel}>Code</Text>
            <Text style={styles.codePreviewToggle}>
              {showFullCode ? '\u25BC' : '\u25B6'}
            </Text>
          </Pressable>

          {showFullCode && (
            <ScrollView
              horizontal
              style={styles.codeContainer}
              contentContainerStyle={styles.codeContent}
            >
              <Text style={styles.codeText}>{code}</Text>
            </ScrollView>
          )}

          {/* Status indicator */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIndicator,
                executionResult.success ? styles.statusSuccess : styles.statusError,
              ]}
            />
            <Text style={styles.statusText}>
              {executionResult.success ? 'Success' : 'Error'}
            </Text>
            <Text style={styles.executionTime}>
              {executionResult.executionTime}ms
            </Text>
          </View>

          {/* Output */}
          <View style={styles.outputSection}>
            <Text style={styles.outputLabel}>Output:</Text>
            <ScrollView
              style={styles.outputContainer}
              contentContainerStyle={styles.outputContent}
            >
              <Text
                style={[
                  styles.outputText,
                  !executionResult.success && styles.errorText,
                ]}
              >
                {executionResult.error || executionResult.output}
              </Text>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981', // Green accent for code execution
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  languageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  languageIcon: {
    fontSize: fontSize.sm,
  },
  languageName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#000',
  },
  headerText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
  },
  browserBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  browserBadgeText: {
    fontSize: fontSize.xs,
    color: '#10b981',
    fontWeight: fontWeight.medium,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  codeContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    maxHeight: 200,
  },
  codeContent: {
    padding: spacing.sm,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  expandText: {
    fontSize: fontSize.xs,
    color: colors.accent.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  deniedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  deniedIcon: {
    fontSize: fontSize.lg,
  },
  deniedText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  executingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  executingText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  resultSection: {
    marginTop: spacing.sm,
  },
  codePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  codePreviewLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  codePreviewToggle: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusSuccess: {
    backgroundColor: '#10b981',
  },
  statusError: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  executionTime: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginLeft: 'auto',
  },
  outputSection: {
    marginTop: spacing.sm,
  },
  outputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  outputContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    maxHeight: 200,
  },
  outputContent: {
    padding: spacing.sm,
  },
  outputText: {
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
    color: '#10b981',
    lineHeight: 20,
  },
  errorText: {
    color: '#ef4444',
  },
});
