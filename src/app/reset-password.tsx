import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Button, Card, ErrorNote, Input, Screen, Text } from '../components/ui';
import {
  cleanCode,
  isCodeComplete,
  looksLikeEmail,
  newPasswordProblem,
  RESEND_COOLDOWN_SECONDS,
} from '../features/account/logic';
import { friendlyError, requestPasswordReset, setNewPassword, verifyResetCode } from '../lib/api';
import { useTheme } from '../theme/theme';

type Step = 'email' | 'code' | 'done';

/**
 * Forgot password, in three steps:
 *   1. enter your email, and we email a code
 *   2. enter the code and a new password
 *   3. done: you're signed in with the new password
 * A typed code is used instead of an email link because links can't reliably
 * open the app while it runs in Expo Go (and they work the same in the real app).
 */
export default function ResetPassword() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  // Once the code is accepted it can't be used again, so remember that and only retry saving the password.
  const [codeAccepted, setCodeAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const waitSeconds = sentAt ? Math.max(0, RESEND_COOLDOWN_SECONDS - Math.floor((now - sentAt) / 1000)) : 0;
  useEffect(() => {
    if (!sentAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentAt]);

  async function sendCode() {
    setError(null);
    if (!looksLikeEmail(email)) {
      setError('Enter the email you signed up with.');
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSentAt(Date.now());
      setNow(Date.now());
      setStep('code');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setError(null);
    if (!codeAccepted && !isCodeComplete(code)) {
      setError('Enter the code from the email.');
      return;
    }
    const problem = newPasswordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      if (!codeAccepted) {
        await verifyResetCode(email, code);
        setCodeAccepted(true);
      }
      await setNewPassword(password);
      setStep('done');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Text variant="largeTitle">Reset password</Text>

        {step === 'email' ? (
          <Card style={{ gap: 12 }}>
            <Text variant="body">Enter the email you signed up with. We’ll send you a code to set a new password.</Text>
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <ErrorNote message={error} />
            <Button title="Email me a code" onPress={sendCode} loading={busy} />
          </Card>
        ) : null}

        {step === 'code' ? (
          <Card style={{ gap: 12 }}>
            <Text variant="body">
              If {email.trim()} has an account, a code is on its way. It can take a minute; check spam too.
            </Text>
            {!codeAccepted ? (
              <Input
                placeholder="Code from the email"
                value={code}
                onChangeText={(t) => setCode(cleanCode(t))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={10}
              />
            ) : (
              <Text variant="small" color={c.accentInk}>
                Code accepted. Now save your new password.
              </Text>
            )}
            <Input
              placeholder="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <Input
              placeholder="New password again"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <ErrorNote message={error} />
            <Button title="Save new password" onPress={reset} loading={busy} />
            {!codeAccepted ? (
              <>
                <Pressable
                  onPress={sendCode}
                  disabled={waitSeconds > 0 || busy}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={{ alignSelf: 'center' }}
                >
                  <Text variant="body" color={waitSeconds > 0 ? c.muted : c.accent}>
                    {waitSeconds > 0 ? `Send a new code in ${waitSeconds}s` : 'Send a new code'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setStep('email');
                    setCode('');
                    setError(null);
                  }}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={{ alignSelf: 'center' }}
                >
                  <Text variant="small" color={c.muted}>
                    Use a different email
                  </Text>
                </Pressable>
              </>
            ) : null}
          </Card>
        ) : null}

        {step === 'done' ? (
          <Card style={{ gap: 12 }}>
            <Text variant="heading">Password updated</Text>
            <Text variant="body">You’re signed in. Use the new password next time you sign in.</Text>
            <Button title="Continue" onPress={() => router.replace('/')} />
          </Card>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
