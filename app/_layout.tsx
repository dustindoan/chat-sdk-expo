import '../polyfills.js';
import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '../components/toast';

const colors = {
  background: '#0a0a0a',
  headerBackground: '#0a0a0a',
  text: '#fafafa',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ToastProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: colors.background,
              },
            }}
          >
            <Stack.Screen name="(drawer)" />
          </Stack>
        </ToastProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
