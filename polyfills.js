import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  try {
    require('@stardazed/streams-text-encoding');
  } catch (e) {
    console.warn('Failed to load streams-text-encoding polyfill:', e);
  }

  try {
    if (typeof globalThis.structuredClone === 'undefined') {
      const clone = require('@ungap/structured-clone').default;
      globalThis.structuredClone = clone;
    }
  } catch (e) {
    console.warn('Failed to load structuredClone polyfill:', e);
  }
}
