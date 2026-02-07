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

export default function RegisterScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use email username as name (before @)
      const name = email.split('@')[0];
      await signUp(name, email.trim(), password);
      // Redirect to the original URL if provided, otherwise go home
      router.replace(redirect || '/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account!';
      // Check for common errors
      if (message.toLowerCase().includes('exist')) {
        setError('Account already exists!');
      } else {
        setError(message);
      }
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
            <CardTitle className="text-xl font-semibold">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Create an account with your email and password
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
                autoComplete="new-password"
                className="bg-secondary"
              />
            </View>

            <Button
              onPress={handleRegister}
              disabled={isLoading}
              className="mt-2"
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text>Sign Up</Text>
              )}
            </Button>

            <Text className="mt-2 text-center text-sm text-muted-foreground">
              {"Already have an account? "}
              <Link
                href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
                asChild
              >
                <Text className="text-sm font-semibold text-foreground">Sign in</Text>
              </Link>
              {" instead."}
            </Text>
          </CardContent>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}
