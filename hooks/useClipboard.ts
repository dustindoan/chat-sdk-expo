import { useCallback } from 'react';
import { Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

export function useClipboard() {
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
      } else {
        Clipboard.setString(text);
      }
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  return { copyToClipboard };
}
