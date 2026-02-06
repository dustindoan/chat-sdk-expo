/**
 * ResearchAnswerTool - Renders the final answer from a research workflow
 *
 * Displays the answer as formatted markdown text with confidence indicator.
 */

import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { SimpleMarkdown } from '../SimpleMarkdown';
import type { ToolUIProps, ToolState } from './types';

interface ProvideAnswerArgs {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  sources?: string[];
}

interface ProvideAnswerResult {
  completed: boolean;
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
}

export function ResearchAnswerTool({ state, args, result }: ToolUIProps) {
  const typedArgs = args as ProvideAnswerArgs | undefined;
  const typedResult = result as ProvideAnswerResult | undefined;

  // Get the answer from either args (streaming) or result (completed)
  const answer = typedResult?.answer || typedArgs?.answer;
  const confidence = typedResult?.confidence || typedArgs?.confidence;
  const sources = typedResult?.sources || typedArgs?.sources || [];

  if (!answer) {
    return (
      <View className="p-3 bg-secondary rounded-lg">
        <Text className="text-muted-foreground">Preparing answer...</Text>
      </View>
    );
  }

  const confidenceColors = {
    high: 'text-green-500',
    medium: 'text-yellow-500',
    low: 'text-red-500',
  };

  return (
    <View className="rounded-lg overflow-hidden">
      {/* Answer content - rendered as markdown */}
      <SimpleMarkdown text={answer} />

      {/* Confidence and sources footer */}
      {(confidence || sources.length > 0) && (
        <View className="mt-3 pt-3 border-t border-border">
          <View className="flex-row flex-wrap items-center gap-2">
            {confidence && (
              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-muted-foreground">Confidence:</Text>
                <Text className={`text-xs font-medium ${confidenceColors[confidence]}`}>
                  {confidence}
                </Text>
              </View>
            )}
            {sources.length > 0 && (
              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-muted-foreground">
                  • {sources.length} source{sources.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
