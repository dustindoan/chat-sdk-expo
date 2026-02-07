import { useState } from 'react';
import {
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@chat-sdk-expo/auth';
import { Text, Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@chat-sdk-expo/ui/primitives';

export default function LoginScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signIn(email.trim(), password);
      // Redirect to the original URL if provided, otherwise go home
      router.replace(redirect || '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-[400px] border-0 bg-transparent shadow-none">
          <CardHeader className="mb-8 items-center gap-2">
            <CardTitle className="text-xl font-semibold">Sign In</CardTitle>
            <CardDescription className="text-center">
              Use your email and password to sign in
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-4">
            {error ? (
              <View className="rounded-lg border border-destructive bg-destructive/20 p-3">
                <Text className="text-center text-sm text-destructive">{error}</Text>
              </View>
            ) : null}

            <View className="gap-2">
              <Text variant="muted" className="text-sm">Email Address</Text>
              <Input
                placeholder="user@acme.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                autoFocus
                className="bg-secondary"
              />
            </View>

            <View className="gap-2">
              <Text variant="muted" className="text-sm">Password</Text>
              <Input
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                className="bg-secondary"
              />
            </View>

            <Button
              onPress={handleLogin}
              disabled={isLoading}
              className="mt-2"
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text>Sign in</Text>
              )}
            </Button>

            <Text className="mt-2 text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link
                href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}
                asChild
              >
                <Text className="text-sm font-semibold text-foreground">Sign up</Text>
              </Link>
              {" for free."}
            </Text>
          </CardContent>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}
