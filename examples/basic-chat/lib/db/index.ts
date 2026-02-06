export * from './schema';
export * from './queries';
export { db, dbAdapter } from './client';

// Re-export adapter types for consumers who want to use the adapter directly
export type { DatabaseAdapter } from '@chat-sdk-expo/db';
