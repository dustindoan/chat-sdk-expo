import '../polyfills.js';
import '../global.css';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '../components/toast';
import { ArtifactProvider } from '../contexts/ArtifactContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SideBySideLayout } from '../components/SideBySideLayout';
import { colors } from '../components/theme';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  // Auth redirects are handled by the login/register screens themselves
  // to support redirect-after-login with query params

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AuthProvider>
          <ToastProvider>
            <ArtifactProvider>
              <AuthGate>
                <SideBySideLayout>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: {
                        backgroundColor: colors.background.primary,
                      },
                    }}
                  >
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(drawer)" />
                  </Stack>
                </SideBySideLayout>
              </AuthGate>
            </ArtifactProvider>
          </ToastProvider>
        </AuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});
