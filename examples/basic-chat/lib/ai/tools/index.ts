/**
 * AI Tool definitions barrel export
 *
 * Re-exports tools from @chat-sdk-expo/tools package
 * with app-specific wrappers for database integration.
 */

// Re-export from packages
export {
  // Weather tool
  weatherTool,
  createWeatherTool,
  weatherInputSchema,
  // Temperature tool
  convertTemperatureTool,
  temperatureInputSchema,
  // Code execution tool
  executeCodeTool,
  createExecuteCodeTool,
  executeCodeInputSchema,
  supportedLanguages,
  // Document tool factories
  createDocumentTool,
  updateDocumentTool,
  artifactKinds,
} from '@chat-sdk-expo/tools';

// Re-export types
export type {
  WeatherAtLocation,
  WeatherInput,
  WeatherCondition,
  WeatherResult,
  WeatherToolOptions,
  TemperatureResult,
  TemperatureInput,
  ExecuteCodeInput,
  ExecuteCodeResult,
  ExecuteCodeToolOptions,
  SupportedLanguage,
  CreateDocumentResult,
  CreateDocumentToolProps,
  UpdateDocumentResult,
  UpdateDocumentToolProps,
  DocumentToSave,
  ExistingDocument,
} from '@chat-sdk-expo/tools';

// Convenience aliases for use in streamText tools object
export { weatherTool as weather } from '@chat-sdk-expo/tools';
export { convertTemperatureTool as convertTemperature } from '@chat-sdk-expo/tools';
export { executeCodeTool as executeCode } from '@chat-sdk-expo/tools';
