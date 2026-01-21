import { tool } from 'ai';
import { z } from 'zod';

/**
 * Temperature conversion result type
 */
export interface TemperatureResult {
  fahrenheit: number;
  celsius: number;
}

/**
 * Temperature tool input schema
 */
export const temperatureInputSchema = z.object({
  fahrenheit: z.number().describe('The temperature in Fahrenheit to convert'),
});

export type TemperatureInput = z.infer<typeof temperatureInputSchema>;

/**
 * Temperature conversion tool definition
 * Converts Fahrenheit to Celsius
 */
export const convertTemperatureTool = tool({
  description: 'Convert a temperature from Fahrenheit to Celsius',
  inputSchema: temperatureInputSchema,
  execute: async ({ fahrenheit }): Promise<TemperatureResult> => {
    const celsius = Math.round((fahrenheit - 32) * (5 / 9) * 10) / 10;
    return { fahrenheit, celsius };
  },
});
