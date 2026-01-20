import '../polyfills.js';
import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';

const colors = {
  background: '#0a0a0a',
  headerBackground: '#0a0a0a',
  text: '#fafafa',
};

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <Stack
        screenOptions={{
          title: 'AI Chat',
          headerStyle: {
            backgroundColor: colors.headerBackground,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
    </KeyboardProvider>
  );
}
