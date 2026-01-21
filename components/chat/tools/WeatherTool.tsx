import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { ToolUIProps } from './types';
import type { WeatherInput, WeatherAtLocation } from '../../../lib/ai/tools';

type WeatherToolProps = ToolUIProps<WeatherInput, WeatherAtLocation>;

/**
 * Sun icon SVG component
 */
function SunIcon({ size = 32, color = '#FEF08A' }: { size?: number; color?: string }) {
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
function MoonIcon({ size = 32, color = '#93C5FD' }: { size?: number; color?: string }) {
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

  // Day/night gradient colors
  const gradientColors = isDay
    ? ['#38bdf8', '#3b82f6', '#2563eb'] // sky-400 -> blue-500 -> blue-600
    : ['#312e81', '#581c87', '#1e293b']; // indigo-900 -> purple-900 -> slate-900

  const iconAccentColor = isDay ? '#FEF08A' : '#93C5FD'; // yellow-200 / blue-200

  return (
    <View style={[styles.container, { backgroundColor: gradientColors[1] }]}>
      {/* Overlay for glass effect */}
      <View style={styles.overlay} />

      {/* Loading state */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>
            Fetching weather{args?.city ? ` for ${args.city}` : ''}...
          </Text>
        </View>
      )}

      {/* Error state */}
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{result.error}</Text>
        </View>
      )}

      {/* Result state */}
      {hasResult && (
        <View style={styles.content}>
          {/* Header row: location and time */}
          <View style={styles.headerRow}>
            <Text style={styles.location}>{location}</Text>
            <Text style={styles.dateTime}>
              {formatDate(result.current.time)}
            </Text>
          </View>

          {/* Main weather display */}
          <View style={styles.mainRow}>
            <View style={styles.tempDisplay}>
              <View style={styles.iconContainer}>
                {isDay ? (
                  <SunIcon size={32} color={iconAccentColor} />
                ) : (
                  <MoonIcon size={32} color={iconAccentColor} />
                )}
              </View>
              <Text style={styles.temperature}>
                {n(result.current.temperature_2m)}
                <Text style={styles.temperatureUnit}>
                  {result.current_units.temperature_2m}
                </Text>
              </Text>
            </View>

            <View style={styles.highLow}>
              <Text style={styles.highTemp}>H: {n(currentHigh)}°</Text>
              <Text style={styles.lowTemp}>L: {n(currentLow)}°</Text>
            </View>
          </View>

          {/* Hourly forecast */}
          <View style={styles.forecastContainer}>
            <Text style={styles.forecastTitle}>Hourly Forecast</Text>
            <View style={styles.forecastRow}>
              {displayTimes.map((time, index) => {
                const isCurrentHour = index === 0;
                return (
                  <View
                    key={time}
                    style={[
                      styles.forecastItem,
                      isCurrentHour && styles.forecastItemCurrent,
                    ]}
                  >
                    <Text style={styles.forecastHour}>
                      {isCurrentHour ? 'Now' : formatHour(time)}
                    </Text>
                    <CloudIcon size={16} color={iconAccentColor} />
                    <Text style={styles.forecastTemp}>
                      {n(displayTemperatures[index])}°
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Sunrise/Sunset */}
          <View style={styles.sunTimesRow}>
            <Text style={styles.sunTime}>
              Sunrise: {formatTime(result.daily.sunrise[0])}
            </Text>
            <Text style={styles.sunTime}>
              Sunset: {formatTime(result.daily.sunset[0])}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginVertical: spacing.sm,
    minHeight: 200,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 200,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: '#FCA5A5', // red-300
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  location: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dateTime: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tempDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    opacity: 0.9,
  },
  temperature: {
    fontSize: 36,
    fontWeight: fontWeight.normal,
    color: 'white',
  },
  temperatureUnit: {
    fontSize: fontSize.lg,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  highLow: {
    alignItems: 'flex-end',
  },
  highTemp: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  lowTemp: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  forecastContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  forecastTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.sm,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
  },
  forecastItemCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  forecastHour: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  forecastTemp: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: 'white',
  },
  sunTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sunTime: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
