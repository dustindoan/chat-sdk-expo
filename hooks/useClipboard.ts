import { useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';

export function useClipboard() {
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  return { copyToClipboard };
}
