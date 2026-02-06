/**
 * @chat-sdk-expo/tools
 *
 * AI tool definitions for chat applications using AI SDK v6.
 * Provides ready-to-use tools and factory functions for custom tools.
 */

// Weather tool
export {
  weatherTool,
  createWeatherTool,
  weatherInputSchema,
} from './weather';
export type {
  WeatherAtLocation,
  WeatherInput,
  WeatherCondition,
  WeatherResult,
  WeatherToolOptions,
} from './weather';

// Temperature conversion tool
export {
  convertTemperatureTool,
  temperatureInputSchema,
} from './temperature';
export type {
  TemperatureResult,
  TemperatureInput,
} from './temperature';

// Code execution tool
export {
  executeCodeTool,
  createExecuteCodeTool,
  executeCodeInputSchema,
  supportedLanguages,
} from './executeCode';
export type {
  ExecuteCodeInput,
  ExecuteCodeResult,
  ExecuteCodeToolOptions,
  SupportedLanguage,
} from './executeCode';

// Document tools (factory functions - require database adapters)
export {
  createDocumentTool,
  artifactKinds,
} from './createDocument';
export type {
  CreateDocumentResult,
  CreateDocumentToolProps,
  DocumentToSave,
} from './createDocument';

export {
  updateDocumentTool,
} from './updateDocument';
export type {
  UpdateDocumentResult,
  UpdateDocumentToolProps,
  ExistingDocument,
} from './updateDocument';

// Convenience aliases for use in streamText tools object
export { weatherTool as weather } from './weather';
export { convertTemperatureTool as convertTemperature } from './temperature';
export { executeCodeTool as executeCode } from './executeCode';
