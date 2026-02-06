import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import type { ToolUIProps } from './types';
import type { ExecuteCodeInput, ExecuteCodeResult } from '../../../lib/ai/tools/executeCode';
import {
  executeCode,
  supportsInBrowserExecution,
  type ExecutionResult,
} from '../../../lib/code-execution';

type CodeExecutionToolProps = ToolUIProps<ExecuteCodeInput, ExecuteCodeResult>;

// Language display config
const LANGUAGE_CONFIG = {
  python: { name: 'Python', bgClass: 'bg-[#3776ab]', icon: '\uD83D\uDC0D' },
  javascript: { name: 'JavaScript', bgClass: 'bg-[#f7df1e]', icon: '\uD83D\uDFE8' },
} as const;

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

  // Use useResolveClassNames for ActivityIndicator colors
  const primaryStyle = useResolveClassNames('text-primary');

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
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.javascript;
  const code = args?.code || '';
  const codeLines = code.split('\n');
  const truncatedCode =
    codeLines.length > 10 ? codeLines.slice(0, 10).join('\n') + '\n...' : code;

  const toggleCodeView = useCallback(() => {
    setShowFullCode((prev) => !prev);
  }, []);

  return (
    <View className="my-2 rounded-lg border-l-[3px] border-l-success bg-secondary p-3">
      {/* Header */}
      <View className="mb-3 flex-row items-center gap-2">
        <View className={`flex-row items-center gap-1 rounded px-2 py-1 ${config.bgClass}`}>
          <Text className="text-sm">{config.icon}</Text>
          <Text className="text-xs font-semibold text-black">{config.name}</Text>
        </View>
        <Text variant="muted" className="text-sm font-semibold">Code Execution</Text>
        {supportsInBrowserExecution() && (
          <View className="rounded bg-emerald-500/20 px-2 py-0.5">
            <Text className="text-xs font-medium text-emerald-500">In-Browser</Text>
          </View>
        )}
      </View>

      {/* Loading state (streaming args) */}
      {isLoading && (
        <View className="flex-row items-center gap-2 py-2">
          <ActivityIndicator size="small" color={primaryStyle.color as string} />
          <Text variant="muted" className="text-sm">Preparing code...</Text>
        </View>
      )}

      {/* Approval pending state */}
      {isApprovalPending && args && (
        <View className="mt-2">
          <Text variant="muted" className="mb-1 text-sm font-medium">Code to execute:</Text>
          <Button variant="ghost" className="h-auto p-0" onPress={toggleCodeView}>
            <ScrollView
              horizontal
              className="max-h-[200px] rounded-md bg-card"
              contentContainerStyle={{ padding: 8 }}
            >
              <Text className="font-mono text-sm leading-5">
                {showFullCode ? code : truncatedCode}
              </Text>
            </ScrollView>
            {codeLines.length > 10 && (
              <Text className="mt-1 text-center text-xs text-primary">
                {showFullCode ? 'Show less' : `Show all ${codeLines.length} lines`}
              </Text>
            )}
          </Button>
        </View>
      )}

      {/* Denied state */}
      {wasDenied && (
        <View className="flex-row items-center justify-center gap-2 py-3">
          <Text className="text-lg">{'\u26D4'}</Text>
          <Text variant="muted" className="text-sm">Code execution was denied</Text>
        </View>
      )}

      {/* Executing state */}
      {isExecuting && (
        <View className="flex-row items-center justify-center gap-2 py-3">
          <ActivityIndicator size="small" color={primaryStyle.color as string} />
          <Text variant="muted" className="text-sm">
            Executing {config.name} code...
          </Text>
        </View>
      )}

      {/* Execution result */}
      {executionResult && !isExecuting && (
        <View className="mt-2">
          {/* Code preview (collapsed) */}
          <Button
            variant="ghost"
            className="h-auto flex-row items-center gap-2 self-start p-0 py-1"
            onPress={toggleCodeView}
          >
            <Text variant="muted" className="text-sm font-medium">Code</Text>
            <Text variant="muted" className="text-xs">
              {showFullCode ? '\u25BC' : '\u25B6'}
            </Text>
          </Button>

          {showFullCode && (
            <ScrollView
              horizontal
              className="max-h-[200px] rounded-md bg-card"
              contentContainerStyle={{ padding: 8 }}
            >
              <Text className="font-mono text-sm leading-5">{code}</Text>
            </ScrollView>
          )}

          {/* Status indicator */}
          <View className="mb-1 mt-2 flex-row items-center gap-2">
            <View
              className={`h-2 w-2 rounded-full ${executionResult.success ? 'bg-success' : 'bg-destructive'}`}
            />
            <Text className="text-sm font-medium">
              {executionResult.success ? 'Success' : 'Error'}
            </Text>
            <Text variant="muted" className="ml-auto text-xs">
              {executionResult.executionTime}ms
            </Text>
          </View>

          {/* Output */}
          <View className="mt-2">
            <Text variant="muted" className="mb-1 text-sm font-medium">Output:</Text>
            <ScrollView
              className="max-h-[200px] rounded-md bg-card"
              contentContainerStyle={{ padding: 8 }}
            >
              <Text
                className={`font-mono text-sm leading-5 ${executionResult.success ? 'text-emerald-500' : 'text-red-500'}`}
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
