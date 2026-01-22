import { tool } from 'ai';
import { z } from 'zod';

/**
 * Weather data structure from Open-Meteo API
 */
export interface WeatherAtLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  cityName?: string;
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
  };
  hourly_units: {
    time: string;
    temperature_2m: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
  daily_units: {
    time: string;
    sunrise: string;
    sunset: string;
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
  };
  error?: string;
}

/**
 * Weather tool input schema
 */
export const weatherInputSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z
    .string()
    .describe("City name (e.g., 'San Francisco', 'New York', 'Tokyo')")
    .optional(),
});

export type WeatherInput = z.infer<typeof weatherInputSchema>;

// Legacy types for backwards compatibility
export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'partly cloudy';
export interface WeatherResult extends WeatherAtLocation {}

/**
 * Geocode a city name to coordinates using Open-Meteo Geocoding API
 */
async function geocodeCity(
  city: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    return {
      latitude: result.latitude,
      longitude: result.longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Weather tool definition
 * Fetches real weather data from Open-Meteo API
 * Requires user approval before execution (Phase 11)
 */
export const weatherTool = tool({
  description:
    'Get the current weather at a location. You can provide either coordinates or a city name.',
  inputSchema: weatherInputSchema,
  needsApproval: true,
  execute: async (input): Promise<WeatherAtLocation> => {
    let latitude: number;
    let longitude: number;

    if (input.city) {
      const coords = await geocodeCity(input.city);
      if (!coords) {
        return {
          error: `Could not find coordinates for "${input.city}". Please check the city name.`,
        } as WeatherAtLocation;
      }
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else if (input.latitude !== undefined && input.longitude !== undefined) {
      latitude = input.latitude;
      longitude = input.longitude;
    } else {
      return {
        error:
          'Please provide either a city name or both latitude and longitude coordinates.',
      } as WeatherAtLocation;
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
    );

    const weatherData: WeatherAtLocation = await response.json();

    if (input.city) {
      weatherData.cityName = input.city;
    }

    return weatherData;
  },
});
