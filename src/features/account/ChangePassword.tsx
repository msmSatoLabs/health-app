import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Button, Card, ErrorNote, Input, Text } from '../../components/ui';
import { changePassword, friendlyError } from '../../lib/api';
import { useTheme } from '../../theme/theme';
import { newPasswordProblem } from './logic';

/** Settings → Password: change it with the current one, or reset it by email if forgotten. */
export function ChangePassword({ email }: { email: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function close() {
    setOpen(false);
    setCurrent('');
    setPassword('');
    setConfirm('');
    setError(null);
  }

  async function save() {
    setError(null);
    if (!current) {
      setError('Enter your current password.');
      return;
    }
    const problem = newPasswordProblem(password, confirm, current);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      await changePassword(email, current, password);
      close();
      setSaved(true);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const forgot = (
    <Pressable
      onPress={() => router.push({ pathname: '/reset-password', params: { email } })}
      accessibilityRole="button"
      hitSlop={8}
      style={{ alignSelf: 'center' }}
    >
      <Text variant="small" color={c.accent}>
        Forgot your password? Reset it by email
      </Text>
    </Pressable>
  );

  if (!open) {
    return (
      <Card style={{ gap: 12 }}>
        {saved ? (
          <Text variant="small" color={c.accentInk}>
            Password changed.
          </Text>
        ) : null}
        <Button
          title="Change password"
          kind="secondary"
          onPress={() => {
            setSaved(false);
            setOpen(true);
          }}
        />
        {forgot}
      </Card>
    );
  }

  return (
    <Card style={{ gap: 12 }}>
      <Input
        placeholder="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
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
      <Button title="Save new password" onPress={save} loading={busy} />
      <Button title="Cancel" kind="secondary" onPress={close} disabled={busy} />
      {forgot}
    </Card>
  );
}
