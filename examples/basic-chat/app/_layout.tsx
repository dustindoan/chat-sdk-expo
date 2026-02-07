import '../polyfills.js';
import '../global.css';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PortalHost } from '@rn-primitives/portal';
import { SWRConfig } from 'swr';
import { ToastProvider } from '@chat-sdk-expo/ui/toast';
import { ArtifactProvider } from '../contexts/ArtifactContext';
import { AuthProvider } from '@chat-sdk-expo/better-auth/context';
import { useAuth } from '@chat-sdk-expo/auth';
import { authClient, AUTH_STORAGE_PREFIX } from '../lib/auth/client';
import { generateAPIUrl } from '../utils';
import { LocalLLMProvider } from '../contexts/LocalLLMContext';
import { SideBySideLayout } from '../components/SideBySideLayout';
import { authFetcher } from '../lib/swr';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  // Auth redirects are handled by the login/register screens themselves
  // to support redirect-after-login with query params

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return <>{children}</>;
}

// SWR configuration
// React Native-specific revalidation (AppState, NetInfo, React Navigation focus)
// is handled by useSWRNativeRevalidate in individual hooks
const swrConfig = {
  fetcher: authFetcher,
  dedupingInterval: 5000,
  errorRetryCount: 3,
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AuthProvider authClient={authClient} storagePrefix={AUTH_STORAGE_PREFIX} generateAPIUrl={generateAPIUrl}>
          <LocalLLMProvider>
            <SWRConfig value={swrConfig}>
              <ToastProvider>
                <ArtifactProvider>
                <AuthGate>
                  <SideBySideLayout>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: {
                          backgroundColor: '#0a0a0a',
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
            </SWRConfig>
          </LocalLLMProvider>
        </AuthProvider>
      </KeyboardProvider>
      <PortalHost />
    </GestureHandlerRootView>
  );
}
