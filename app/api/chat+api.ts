import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText, tool, stepCountIs } from 'ai';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

// Load API key from .env file
// Note: Expo Metro bundler doesn't support import.meta.url, so we use readFileSync
function getApiKey(): string {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {
    console.error('Failed to read .env file:', e);
  }
  return process.env.ANTHROPIC_API_KEY || '';
}

const anthropic = createAnthropic({
  apiKey: getApiKey(),
  baseURL: 'https://api.anthropic.com/v1',
});

// Transform messages from useChat format to AI SDK format
// useChat sends messages with 'parts' array, but streamText expects 'content' string
function transformMessages(messages: any[]) {
  return messages.map((msg) => {
    // If message has parts array (from useChat), extract text content
    if (msg.parts && Array.isArray(msg.parts)) {
      const textContent = msg.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('');
      return {
        role: msg.role,
        content: textContent,
      };
    }
    // Otherwise, use content directly
    return {
      role: msg.role,
      content: msg.content || '',
    };
  });
}

export async function POST(request: Request) {
  const { messages, model: modelId } = await request.json();

  // Use the model from the request body, or default to Haiku
  const modelName = modelId || 'claude-haiku-4-5-20251001';

  const result = streamText({
    model: anthropic(modelName),
    system: 'You are a helpful assistant. You can help with coding questions, general knowledge, and more. You also have tools to get weather information and convert temperatures.',
    messages: transformMessages(messages),
    tools: {
      // Weather tool - simulates getting weather for a location
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          // Simulated weather data
          const temperature = Math.round(Math.random() * 40 + 40); // 40-80°F
          const conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'][
            Math.floor(Math.random() * 4)
          ];
          return {
            location,
            temperature,
            unit: 'fahrenheit',
            conditions,
          };
        },
      }),
      // Temperature conversion tool
      convertTemperature: tool({
        description: 'Convert a temperature from Fahrenheit to Celsius',
        inputSchema: z.object({
          fahrenheit: z.number().describe('The temperature in Fahrenheit to convert'),
        }),
        execute: async ({ fahrenheit }) => {
          const celsius = Math.round((fahrenheit - 32) * (5 / 9) * 10) / 10;
          return {
            fahrenheit,
            celsius,
            unit: 'celsius',
          };
        },
      }),
    },
    // Allow up to 5 steps for multi-step tool interactions
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      // Required for streaming to work properly in React Native/Expo
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
