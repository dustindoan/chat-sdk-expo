/**
 * WeekBar - Compact horizontal week navigation strip
 * Inspired by Runna app's week picker UI
 */
import React, { memo, useMemo } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Text } from '@/components/ui/text';

interface WeekBarProps {
  /** Currently selected date */
  selectedDate?: Date;
  /** Called when a day is selected */
  onSelectDate?: (date: Date) => void;
  /** Map of date strings (YYYY-MM-DD) to workout indicators */
  workoutDays?: Record<string, 'run' | 'strength' | 'rest'>;
}

interface DayPillProps {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  workoutType?: 'run' | 'strength' | 'rest';
  onPress: () => void;
}

const DayPill = memo(function DayPill({
  date,
  isSelected,
  isToday,
  workoutType,
  onPress,
}: DayPillProps) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
  const dayNum = date.getDate();

  // Workout indicator colors
  const indicatorColor = workoutType === 'run'
    ? 'bg-success'
    : workoutType === 'strength'
      ? 'bg-orange-500'
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      className={`items-center justify-center rounded-xl px-3 py-2 min-w-[48px] ${
        isSelected
          ? 'bg-primary'
          : isToday
            ? 'bg-secondary'
            : ''
      }`}
      style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}
    >
      <Text
        className={`text-xs font-medium ${
          isSelected
            ? 'text-primary-foreground'
            : 'text-muted-foreground'
        }`}
      >
        {dayName}
      </Text>
      <Text
        className={`text-lg font-semibold ${
          isSelected
            ? 'text-primary-foreground'
            : isToday
              ? 'text-primary'
              : 'text-foreground'
        }`}
      >
        {dayNum}
      </Text>
      {/* Workout indicator dot */}
      {indicatorColor && (
        <View className={`w-1.5 h-1.5 rounded-full mt-0.5 ${indicatorColor}`} />
      )}
    </Pressable>
  );
});

export const WeekBar = memo(function WeekBar({
  selectedDate = new Date(),
  onSelectDate,
  workoutDays = {},
}: WeekBarProps) {
  // Get the week containing the selected date (Sunday to Saturday)
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(selectedDate);

    // Go to start of week (Sunday)
    const dayOfWeek = current.getDay();
    current.setDate(current.getDate() - dayOfWeek);

    // Generate 7 days
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, [selectedDate]);

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const selectedDateStr = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  }, [selectedDate]);

  return (
    <View className="py-2">
      {/* Day pills row */}
      <View className="flex-row justify-between">
        {weekDates.map((date) => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDateStr;
          const isToday = dateStr === today;
          const workoutType = workoutDays[dateStr];

          return (
            <DayPill
              key={dateStr}
              date={date}
              isSelected={isSelected}
              isToday={isToday}
              workoutType={workoutType}
              onPress={() => onSelectDate?.(date)}
            />
          );
        })}
      </View>
    </View>
  );
});

export type { WeekBarProps };
