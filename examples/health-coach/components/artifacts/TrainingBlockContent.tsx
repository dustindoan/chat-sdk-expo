/**
 * TrainingBlockContent Component
 *
 * Custom renderer for training block artifacts.
 * Displays a phase → week → day → session hierarchy.
 *
 * Supports both the new schema (phases with dayOfWeek) and
 * graceful fallback for old plans without phases or sparse early drafts.
 */

import React, { memo, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Text } from '@chat-sdk-expo/ui/primitives';
import type { ArtifactStatus } from '@chat-sdk-expo/ui/artifacts';
import type {
  TrainingBlock,
  TrainingPhase,
  TrainingWeek,
  TrainingDay,
  TrainingSession,
  SessionType,
} from '../../lib/artifacts/handlers/training-block';

interface TrainingBlockContentProps {
  content: string;
  status: ArtifactStatus;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

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
 * Category badge colors
 */
const categoryColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  tempo: 'bg-yellow-100 text-yellow-700',
  interval: 'bg-red-100 text-red-700',
  long: 'bg-blue-100 text-blue-700',
  recovery: 'bg-gray-100 text-gray-600',
  'race-pace': 'bg-purple-100 text-purple-700',
  fartlek: 'bg-orange-100 text-orange-700',
};

/**
 * Day of week labels
 */
const dayLabels: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

// =============================================================================
// PARSE
// =============================================================================

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

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Category badge component
 */
const CategoryBadge = memo(function CategoryBadge({ category }: { category: string }) {
  const colorClasses = categoryColors[category] || 'bg-secondary text-foreground';

  return (
    <View className={`rounded-full px-2 py-0.5 ${colorClasses}`}>
      <Text className="text-xs font-medium capitalize">{category}</Text>
    </View>
  );
});

/**
 * Session card component
 */
const SessionCard = memo(function SessionCard({ session }: { session: TrainingSession }) {
  const config = sessionTypeConfig[session.type] || sessionTypeConfig.run;
  const iconStyle = useResolveClassNames(config.colorClass);
  const mutedStyle = useResolveClassNames('text-muted-foreground');
  const successStyle = useResolveClassNames('text-green-500');

  return (
    <View className={`flex-row items-start gap-3 rounded-lg bg-card p-3 ${session.completed ? 'opacity-60' : ''}`}>
      <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-secondary">
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
          {session.category && (
            <CategoryBadge category={session.category} />
          )}
        </View>

        {/* Metadata row */}
        <View className="mt-1 flex-row flex-wrap items-center gap-x-3 gap-y-0.5">
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
          {session.intensity && (
            <View className="flex-row items-center gap-1">
              <Feather name="trending-up" size={12} color={mutedStyle.color as string} />
              <Text variant="muted" className="text-sm">
                {session.intensity.target}
                {session.intensity.zone ? ` (${session.intensity.zone})` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Intervals */}
        {session.intervals && (
          <View className="mt-1.5 rounded border border-border/50 bg-secondary/30 px-2 py-1.5">
            <Text className="text-sm font-medium">
              {session.intervals.reps} × {session.intervals.distance} @ {session.intervals.pace}
            </Text>
            <Text variant="muted" className="text-xs">
              Recovery: {session.intervals.recovery}
            </Text>
          </View>
        )}

        {/* Warmup/Cooldown */}
        {(session.warmup || session.cooldown) && (
          <View className="mt-1 flex-row gap-3">
            {session.warmup && (
              <Text variant="muted" className="text-xs">
                WU: {session.warmup}
              </Text>
            )}
            {session.cooldown && (
              <Text variant="muted" className="text-xs">
                CD: {session.cooldown}
              </Text>
            )}
          </View>
        )}

        {/* Description */}
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
 * Day section component
 */
const DaySection = memo(function DaySection({ day }: { day: TrainingDay }) {
  const mutedStyle = useResolveClassNames('text-muted-foreground');
  const dayLabel = day.dayOfWeek ? dayLabels[day.dayOfWeek] || day.dayOfWeek : 'Day';

  return (
    <View className="mb-3">
      {/* Day header */}
      <View className="mb-1.5 flex-row items-center gap-2 px-4">
        <Text className="text-sm font-semibold text-muted-foreground">
          {dayLabel}
        </Text>
      </View>

      {/* Sessions */}
      <View className="gap-2 px-4">
        {!day.sessions || day.sessions.length === 0 ? (
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
    <View className="mb-5">
      {/* Week header */}
      <View className="mb-2 flex-row items-center justify-between border-b border-border px-4 pb-2">
        <View>
          <Text className="text-base font-bold">
            Week {week.weekNumber}
          </Text>
          {week.focus && (
            <Text variant="muted" className="text-sm">
              {week.focus}
            </Text>
          )}
        </View>
        {week.targetVolume && (
          <View className="rounded-full bg-secondary px-2.5 py-1">
            <Text className="text-xs font-medium text-muted-foreground">
              {week.targetVolume}
            </Text>
          </View>
        )}
      </View>

      {/* Days */}
      {week.days?.map((day, index) => (
        <DaySection key={day.dayOfWeek || `day-${index}`} day={day} />
      ))}
    </View>
  );
});

/**
 * Phase section component
 */
const PhaseSection = memo(function PhaseSection({ phase, index }: { phase: TrainingPhase; index: number }) {
  return (
    <View className="mb-6">
      {/* Phase header */}
      <View className="mb-3 bg-secondary/50 px-4 py-3">
        <Text className="text-lg font-bold">
          {phase.name}
        </Text>
        {(phase.focus || phase.durationWeeks) && (
          <Text variant="muted" className="mt-0.5">
            {[phase.focus, phase.durationWeeks ? `${phase.durationWeeks} weeks` : null].filter(Boolean).join(' · ')}
          </Text>
        )}
        {phase.weeklyVolume && (
          <Text variant="muted" className="text-sm">
            Volume: {phase.weeklyVolume.start} → {phase.weeklyVolume.end}
            {phase.weeklyVolume.progression ? ` (${phase.weeklyVolume.progression})` : ''}
          </Text>
        )}
        {phase.qualitySessions && (
          <Text variant="muted" className="text-sm">
            Quality: {phase.qualitySessions.perWeek}/week{phase.qualitySessions.types ? ` — ${phase.qualitySessions.types.join(', ')}` : ''}
          </Text>
        )}
      </View>

      {/* Weeks within this phase */}
      {phase.weeks?.map((week) => (
        <WeekSection key={week.weekNumber} week={week} />
      ))}
    </View>
  );
});

/**
 * Athlete profile header
 */
const AthleteProfileHeader = memo(function AthleteProfileHeader({
  trainingBlock,
}: {
  trainingBlock: TrainingBlock;
}) {
  const profile = trainingBlock.athleteProfile;
  if (!profile) return null;

  return (
    <View className="mb-4 rounded-lg bg-card p-4">
      <Text className="text-sm font-semibold text-muted-foreground">Athlete Profile</Text>
      <View className="mt-1.5 gap-1">
        <Text className="text-sm">
          <Text className="font-medium">Event:</Text> {profile.goalEvent}
        </Text>
        <Text className="text-sm">
          <Text className="font-medium">Current:</Text> {profile.currentLevel}
        </Text>
        <Text className="text-sm">
          <Text className="font-medium">Gap:</Text> {profile.gap}
        </Text>
        {profile.constraints && (
          <Text className="text-sm">
            <Text className="font-medium">Constraints:</Text> {profile.constraints}
          </Text>
        )}
        {profile.notes && (
          <Text variant="muted" className="mt-1 text-sm italic">
            {profile.notes}
          </Text>
        )}
      </View>
    </View>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * TrainingBlockContent component
 * Renders a phase → week → day → session hierarchy.
 * Falls back gracefully for old plans or sparse early drafts.
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

  // Check for new schema (has phases) vs old/sparse schema
  const hasPhases = trainingBlock.phases && trainingBlock.phases.length > 0;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="py-4">
      {/* Header */}
      <View className="mb-4 px-4">
        <Text className="text-xl font-bold">{trainingBlock.name}</Text>
        {trainingBlock.totalWeeks != null && trainingBlock.totalWeeks > 0 && (
          <Text variant="muted" className="mt-1">
            {trainingBlock.totalWeeks} week program
          </Text>
        )}
      </View>

      {/* Athlete profile */}
      <View className="px-4">
        <AthleteProfileHeader trainingBlock={trainingBlock} />
      </View>

      {/* Phases (new schema) */}
      {hasPhases && trainingBlock.phases.map((phase, index) => (
        <PhaseSection key={phase.name || `phase-${index}`} phase={phase} index={index} />
      ))}

      {/* Fallback for old plans without phases or sparse drafts */}
      {!hasPhases && (
        <View className="px-4 py-8">
          <View className="items-center">
            <Feather name="loader" size={24} color="#999" />
            <Text variant="muted" className="mt-2 text-center">
              Plan is being developed...
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
});
