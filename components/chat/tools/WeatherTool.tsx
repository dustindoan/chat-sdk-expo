import React, { memo } from 'react';
import { View, ActivityIndicator, useWindowDimensions, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Text } from '@/components/ui/text';
import { weatherColors } from '@/lib/theme';
import type { ToolUIProps } from './types';
import type { WeatherInput, WeatherAtLocation } from '../../../lib/ai/tools';

type WeatherToolProps = ToolUIProps<WeatherInput, WeatherAtLocation>;

/**
 * Sun icon SVG component
 */
function SunIcon({ size = 32, color = weatherColors.sunAccent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="5" fill={color} />
      <Line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth="2" />
      <Line x1="12" y1="21" x2="12" y2="23" stroke={color} strokeWidth="2" />
      <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth="2" />
      <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth="2" />
      <Line x1="1" y1="12" x2="3" y2="12" stroke={color} strokeWidth="2" />
      <Line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth="2" />
      <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth="2" />
      <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

/**
 * Moon icon SVG component
 */
function MoonIcon({ size = 32, color = weatherColors.moonAccent }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z" fill={color} />
    </Svg>
  );
}

/**
 * Cloud icon SVG component
 */
function CloudIcon({ size = 16, color = 'rgba(255,255,255,0.6)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  );
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${month} ${day}, ${displayHours}:${minutes} ${ampm}`;
}

/**
 * Format time for display (e.g., "7:15 AM")
 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

/**
 * Format hour for forecast (e.g., "3PM")
 */
function formatHour(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}${ampm}`;
}

/**
 * Check if time is during daytime
 */
function isDaytime(currentTime: string, sunrise: string, sunset: string): boolean {
  const current = new Date(currentTime).getTime();
  const sunriseTime = new Date(sunrise).getTime();
  const sunsetTime = new Date(sunset).getTime();
  return current >= sunriseTime && current <= sunsetTime;
}

/**
 * Round temperature up
 */
function n(num: number): number {
  return Math.ceil(num);
}

/**
 * WeatherTool component
 * Displays weather information in a beautiful card matching chat-sdk design
 */
export const WeatherTool = memo(function WeatherTool({
  state,
  args,
  result,
}: WeatherToolProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const hoursToShow = isMobile ? 5 : 6;

  const isLoading = state === 'partial-call' || state === 'call';
  const hasResult = (state === 'result' || state === 'output-available') && result && !result.error;
  const hasError = result?.error;

  // Calculate derived values when we have data
  let isDay = true;
  let currentHigh = 0;
  let currentLow = 0;
  let displayTimes: string[] = [];
  let displayTemperatures: number[] = [];
  let location = '';

  if (hasResult && result.current && result.hourly && result.daily) {
    // Check if it's daytime
    isDay = isDaytime(
      result.current.time,
      result.daily.sunrise[0],
      result.daily.sunset[0]
    );

    // Calculate high/low for today
    const todayTemps = result.hourly.temperature_2m.slice(0, 24);
    currentHigh = Math.max(...todayTemps);
    currentLow = Math.min(...todayTemps);

    // Get hourly forecast starting from current hour
    const currentTimeIndex = result.hourly.time.findIndex(
      (time) => new Date(time) >= new Date(result.current.time)
    );
    displayTimes = result.hourly.time.slice(currentTimeIndex, currentTimeIndex + hoursToShow);
    displayTemperatures = result.hourly.temperature_2m.slice(
      currentTimeIndex,
      currentTimeIndex + hoursToShow
    );

    // Location display
    location = result.cityName || `${result.latitude?.toFixed(1)}°, ${result.longitude?.toFixed(1)}°`;
  }

  // Day/night gradient colors from theme
  const gradientColors = isDay ? weatherColors.daySky : weatherColors.nightSky;
  const iconAccentColor = isDay ? weatherColors.sunAccent : weatherColors.moonAccent;

  return (
    <View
      className="my-2 min-h-[200px] max-w-[450px] overflow-hidden rounded-2xl"
      style={{ backgroundColor: gradientColors[1] }}
    >
      {/* Overlay for glass effect */}
      <View style={StyleSheet.absoluteFill} className="bg-white/10" />

      {/* Loading state */}
      {isLoading && (
        <View className="min-h-[200px] flex-1 items-center justify-center p-5">
          <ActivityIndicator size="large" color="white" />
          <Text className="mt-3 text-sm text-white/80">
            Fetching weather{args?.city ? ` for ${args.city}` : ''}...
          </Text>
        </View>
      )}

      {/* Error state */}
      {hasError && (
        <View className="p-4">
          <Text className="text-sm text-red-300">{result.error}</Text>
        </View>
      )}

      {/* Result state */}
      {hasResult && (
        <View className="gap-3 p-4">
          {/* Header row: location and time */}
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-medium text-white/80">{location}</Text>
            <Text className="text-xs text-white/60">
              {formatDate(result.current.time)}
            </Text>
          </View>

          {/* Main weather display */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="opacity-90">
                {isDay ? (
                  <SunIcon size={32} color={iconAccentColor} />
                ) : (
                  <MoonIcon size={32} color={iconAccentColor} />
                )}
              </View>
              <Text className="text-4xl font-normal text-white">
                {n(result.current.temperature_2m)}
                <Text className="text-lg text-white/80">
                  {result.current_units.temperature_2m}
                </Text>
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-xs font-medium text-white/90">H: {n(currentHigh)}°</Text>
              <Text className="text-xs text-white/70">L: {n(currentLow)}°</Text>
            </View>
          </View>

          {/* Hourly forecast */}
          <View className="rounded-lg bg-white/10 p-3">
            <Text className="mb-2 text-xs font-medium text-white/80">Hourly Forecast</Text>
            <View className="flex-row justify-between">
              {displayTimes.map((time, index) => {
                const isCurrentHour = index === 0;
                return (
                  <View
                    key={time}
                    className={`flex-1 items-center gap-1 rounded-md px-1 py-2 ${isCurrentHour ? 'bg-white/20' : ''}`}
                  >
                    <Text className="text-xs font-medium text-white/70">
                      {isCurrentHour ? 'Now' : formatHour(time)}
                    </Text>
                    <CloudIcon size={16} color={iconAccentColor} />
                    <Text className="text-xs font-medium text-white">
                      {n(displayTemperatures[index])}°
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Sunrise/Sunset */}
          <View className="flex-row justify-between">
            <Text className="text-xs text-white/60">
              Sunrise: {formatTime(result.daily.sunrise[0])}
            </Text>
            <Text className="text-xs text-white/60">
              Sunset: {formatTime(result.daily.sunset[0])}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});
