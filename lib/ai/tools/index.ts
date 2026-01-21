/**
 * AI Tool definitions barrel export
 */

// Weather tool
export { weatherTool } from './weather';
export type { WeatherAtLocation, WeatherInput, WeatherCondition, WeatherResult } from './weather';

// Temperature conversion tool
export { convertTemperatureTool } from './temperature';
export type { TemperatureResult, TemperatureInput } from './temperature';

// Artifact tools
export { createDocumentTool, artifactKinds } from './createDocument';
export type { CreateDocumentResult } from './createDocument';
export { updateDocumentTool } from './updateDocument';
export type { UpdateDocumentResult } from './updateDocument';

// All tools object for use in streamText
export { weatherTool as weather } from './weather';
export { convertTemperatureTool as convertTemperature } from './temperature';
