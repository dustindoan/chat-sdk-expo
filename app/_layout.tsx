import '../polyfills.js';
import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '../components/toast';
import { ArtifactProvider } from '../contexts/ArtifactContext';
import { SideBySideLayout } from '../components/SideBySideLayout';

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
          <ArtifactProvider>
            <SideBySideLayout>
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
            </SideBySideLayout>
          </ArtifactProvider>
        </ToastProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
