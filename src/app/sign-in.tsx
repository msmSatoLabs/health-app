import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Card, ErrorNote, Input, Screen, Segmented, Text } from '../components/ui';
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
        <View style={{ marginTop: 48, marginBottom: 12, gap: 6 }}>
          <Text variant="title" style={{ fontSize: 34 }}>
            {APP_NAME}
          </Text>
          <Text variant="body" color={c.muted}>
            A group chat that keeps your friends healthy.
          </Text>
        </View>

        {!isSupabaseConfigured ? (
          <Card style={{ gap: 6, backgroundColor: c.warmSoft, borderColor: c.warmSoft }}>
            <Text variant="heading" color={c.warmInk}>
              Supabase isn’t connected yet
            </Text>
            <Text variant="small" color={c.warmInk}>
              Add your project URL and publishable key to a .env file, then restart Expo. SETUP.md walks through it.
            </Text>
          </Card>
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
          <ErrorNote message={error} />
          {notice ? (
            <Text variant="small" color={c.accentInk}>
              {notice}
            </Text>
          ) : null}
          <Button title={mode === 'in' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
