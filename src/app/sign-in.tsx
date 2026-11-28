import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Button, Card, ErrorNote, IconBubble, Input, Notice, Screen, Segmented, Text } from '../components/ui';
import { friendlyError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { APP_NAME } from '../lib/config';
import { useTheme } from '../theme/theme';

export default function SignIn() {
  const { c } = useTheme();
  const { session } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  async function submit() {
    setError(null);
    setNotice(null);
    if (!email.trim() || password.length < 6) {
      setError('Enter your email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'in') {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
      } else {
        const { data, error: e } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (e) throw e;
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.');
      }
      router.replace('/');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ marginTop: 48, marginBottom: 12, gap: 10, alignItems: 'center' }}>
          <IconBubble name="heart" tone="accent" size={72} />
          <Text variant="largeTitle" style={{ textAlign: 'center' }}>
            {APP_NAME}
          </Text>
          <Text variant="body" color={c.muted} style={{ textAlign: 'center' }}>
            A group chat that keeps your friends healthy.
          </Text>
        </View>

        {!isSupabaseConfigured ? (
          <Notice
            title="Supabase isn’t connected yet"
            body="Add your project URL and publishable key to a .env file, then restart Expo. SETUP.md walks through it."
          />
        ) : null}

        <Card style={{ gap: 12 }}>
          <Segmented
            options={[
              { value: 'in', label: 'Sign in' },
              { value: 'up', label: 'Create account' },
            ]}
            value={mode}
            onChange={setMode}
          />
          {mode === 'up' ? <Input placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" /> : null}
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
          {mode === 'in' ? (
            <Pressable
              onPress={() => router.push({ pathname: '/reset-password', params: { email: email.trim() } })}
              accessibilityRole="button"
              hitSlop={8}
              style={{ alignSelf: 'flex-end' }}
            >
              <Text variant="small" color={c.accent}>
                Forgot password?
              </Text>
            </Pressable>
          ) : null}
          <ErrorNote message={error} />
          {notice ? <Notice tone="accent" title={notice} /> : null}
          <Button title={mode === 'in' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
