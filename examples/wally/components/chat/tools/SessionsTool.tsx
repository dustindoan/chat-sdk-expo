/**
 * SessionsTool - Display workout sessions in chat
 * Shows today's scheduled workouts as cards with colored indicators
 */
import React, { memo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { Text } from '@/components/ui/text';
import type { ToolUIProps, ToolState } from './types';

/** Session data from the getTodaySessions tool */
export interface Session {
  id: string;
  type: 'run' | 'strength' | 'rest' | 'cross-training';
  title: string;
  duration?: string;
  distance?: string;
  description?: string;
  completed?: boolean;
}

interface SessionsResult {
  date: string;
  sessions: Session[];
}

interface SessionsToolProps extends ToolUIProps {
  args?: { date?: string };
  result?: SessionsResult;
}

const SessionCard = memo(function SessionCard({ session }: { session: Session }) {
  // Border color based on session type
  const borderColorClass = session.type === 'run'
    ? 'border-l-success'
    : session.type === 'strength'
      ? 'border-l-orange-500'
      : session.type === 'cross-training'
        ? 'border-l-blue-500'
        : 'border-l-muted-foreground';

  // Icon based on type
  const typeIcon = session.type === 'run'
    ? '🏃'
    : session.type === 'strength'
      ? '💪'
      : session.type === 'cross-training'
        ? '🚴'
        : '😴';

  return (
    <View
      className={`bg-secondary rounded-lg p-3 border-l-4 ${borderColorClass} ${
        session.completed ? 'opacity-60' : ''
      }`}
    >
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">{typeIcon}</Text>
          <Text className={`font-medium text-foreground ${session.completed ? 'line-through' : ''}`}>
            {session.title}
          </Text>
        </View>
        {session.completed && (
          <Text className="text-xs text-success">✓ Done</Text>
        )}
      </View>

      <View className="flex-row items-center gap-3 mt-1">
        {session.duration && (
          <Text className="text-sm text-muted-foreground">
            ⏱ {session.duration}
          </Text>
        )}
        {session.distance && (
          <Text className="text-sm text-muted-foreground">
            📏 {session.distance}
          </Text>
        )}
      </View>

      {session.description && (
        <Text className="text-sm text-muted-foreground mt-2">
          {session.description}
        </Text>
      )}
    </View>
  );
});

export const SessionsTool = memo(function SessionsTool({
  state,
  args,
  result,
}: SessionsToolProps) {
  const primaryStyle = useResolveClassNames('text-primary');
  const isLoading = state === 'partial-call' || state === 'call';
  const hasResult = state === 'output-available';

  // Loading state
  if (isLoading) {
    return (
      <View className="my-2 p-4 rounded-xl bg-secondary">
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color={primaryStyle.color as string} />
          <Text className="text-muted-foreground">
            Loading sessions{args?.date ? ` for ${args.date}` : ''}...
          </Text>
        </View>
      </View>
    );
  }

  // No result yet
  if (!hasResult || !result) {
    return null;
  }

  const { date, sessions } = result;

  // Format date for display
  // Parse date string as local time (not UTC) to avoid timezone shift
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day); // month is 0-indexed
  const isToday = new Date().toDateString() === dateObj.toDateString();
  const dateLabel = isToday
    ? "Today's Sessions"
    : dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

  // No sessions
  if (!sessions || sessions.length === 0) {
    return (
      <View className="my-2 p-4 rounded-xl bg-secondary">
        <Text className="font-medium text-foreground mb-1">{dateLabel}</Text>
        <Text className="text-muted-foreground">
          No workouts scheduled. Rest day! 🧘
        </Text>
      </View>
    );
  }

  return (
    <View className="my-2">
      <Text className="font-medium text-foreground mb-2 px-1">{dateLabel}</Text>
      <View className="gap-2">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </View>
    </View>
  );
});
