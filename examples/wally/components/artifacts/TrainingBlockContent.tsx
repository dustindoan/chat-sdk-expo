/**
 * TrainingBlockContent Component
 *
 * Custom renderer for training block artifacts.
 * Displays a vertical list of sessions grouped by day.
 */

import React, { memo, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Text } from '@/components/ui/text';
import type { ArtifactStatus } from '../../lib/artifacts/types';
import type {
  TrainingBlock,
  TrainingWeek,
  TrainingDay,
  TrainingSession,
  SessionType,
  TimeOfDay,
} from '../../lib/artifacts/handlers/training-block';

interface TrainingBlockContentProps {
  content: string;
  status: ArtifactStatus;
}

/**
 * Session type icons and colors
 */
const sessionTypeConfig: Record<SessionType, { icon: keyof typeof Feather.glyphMap; colorClass: string }> = {
  run: { icon: 'activity', colorClass: 'text-primary' },
  strength: { icon: 'zap', colorClass: 'text-orange-500' },
  rest: { icon: 'moon', colorClass: 'text-muted-foreground' },
  'cross-training': { icon: 'compass', colorClass: 'text-green-500' },
};

/**
 * Time of day display
 */
const timeOfDayLabels: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  any: '',
};

/**
 * Parse training block JSON safely
 */
function parseTrainingBlock(content: string): TrainingBlock | null {
  try {
    return JSON.parse(content) as TrainingBlock;
  } catch {
    return null;
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get full day of week
 */
function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Session card component - full width for list layout
 */
const SessionCard = memo(function SessionCard({ session }: { session: TrainingSession }) {
  const config = sessionTypeConfig[session.type] || sessionTypeConfig.run;
  const iconStyle = useResolveClassNames(config.colorClass);
  const mutedStyle = useResolveClassNames('text-muted-foreground');
  const successStyle = useResolveClassNames('text-green-500');

  return (
    <View className={`flex-row items-center gap-3 rounded-lg bg-card p-3 ${session.completed ? 'opacity-60' : ''}`}>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
        <Feather name={config.icon} size={20} color={iconStyle.color as string} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-medium">
            {session.title}
          </Text>
          {session.completed && (
            <Feather name="check-circle" size={16} color={successStyle.color as string} />
          )}
        </View>
        <View className="mt-0.5 flex-row flex-wrap items-center gap-x-3 gap-y-0.5">
          {session.timeOfDay && session.timeOfDay !== 'any' && (
            <View className="flex-row items-center gap-1">
              <Feather name="clock" size={12} color={mutedStyle.color as string} />
              <Text variant="muted" className="text-sm">
                {timeOfDayLabels[session.timeOfDay]}
              </Text>
            </View>
          )}
          {session.duration && (
            <View className="flex-row items-center gap-1">
              <Feather name="watch" size={12} color={mutedStyle.color as string} />
              <Text variant="muted" className="text-sm">
                {session.duration}
              </Text>
            </View>
          )}
          {session.distance && (
            <View className="flex-row items-center gap-1">
              <Feather name="map-pin" size={12} color={mutedStyle.color as string} />
              <Text variant="muted" className="text-sm">
                {session.distance}
              </Text>
            </View>
          )}
        </View>
        {session.description && (
          <Text variant="muted" className="mt-1 text-sm" numberOfLines={2}>
            {session.description}
          </Text>
        )}
      </View>
    </View>
  );
});

/**
 * Day section component - header with sessions below
 */
const DaySection = memo(function DaySection({ day }: { day: TrainingDay }) {
  const isToday = day.date === new Date().toISOString().split('T')[0];
  const mutedStyle = useResolveClassNames('text-muted-foreground');

  return (
    <View className="mb-4">
      {/* Day header */}
      <View className={`mb-2 flex-row items-center gap-2 px-4 ${isToday ? '' : ''}`}>
        <Text className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
          {getDayOfWeek(day.date)}
        </Text>
        <Text className={`text-sm ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
          {formatDate(day.date)}
        </Text>
        {isToday && (
          <View className="rounded-full bg-primary px-2 py-0.5">
            <Text className="text-xs font-medium text-primary-foreground">Today</Text>
          </View>
        )}
      </View>

      {/* Sessions */}
      <View className="gap-2 px-4">
        {day.sessions.length === 0 ? (
          <View className="flex-row items-center gap-2 rounded-lg bg-card/50 p-3">
            <Feather name="moon" size={16} color={mutedStyle.color as string} />
            <Text variant="muted">Rest Day</Text>
          </View>
        ) : (
          day.sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </View>
    </View>
  );
});

/**
 * Week section component
 */
const WeekSection = memo(function WeekSection({ week }: { week: TrainingWeek }) {
  return (
    <View className="mb-6">
      {/* Week header */}
      <View className="mb-3 border-b border-border px-4 pb-2">
        <Text className="text-base font-bold">
          Week {week.weekNumber}
        </Text>
        {week.focus && (
          <Text variant="muted" className="text-sm">
            {week.focus}
          </Text>
        )}
      </View>

      {/* Days */}
      {week.days.map((day) => (
        <DaySection key={day.date} day={day} />
      ))}
    </View>
  );
});

/**
 * TrainingBlockContent component
 * Renders a vertical list of sessions grouped by day
 */
export const TrainingBlockContent = memo(function TrainingBlockContent({
  content,
  status,
}: TrainingBlockContentProps) {
  const trainingBlock = useMemo(() => parseTrainingBlock(content), [content]);

  if (!trainingBlock) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text variant="muted">Unable to parse training block</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="py-4">
      {/* Header */}
      <View className="mb-6 px-4">
        <Text className="text-xl font-bold">{trainingBlock.name}</Text>
        <Text variant="muted" className="mt-1">{trainingBlock.goal}</Text>
        <Text variant="muted" className="mt-1 text-sm">
          {formatDate(trainingBlock.startDate)} – {formatDate(trainingBlock.endDate)}
        </Text>
      </View>

      {/* Weeks */}
      {trainingBlock.weeks.map((week) => (
        <WeekSection key={week.weekNumber} week={week} />
      ))}
    </ScrollView>
  );
});
