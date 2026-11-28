import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, ErrorNote, Input, Text } from '../../components/ui';
import { deleteMyAccount, friendlyError } from '../../lib/api';
import { useTheme } from '../../theme/theme';
import { DELETE_CONFIRM_WORD, isDeleteConfirmed } from './logic';

/**
 * Settings → Delete account (always the last thing on the page).
 * The confirmation is on the page rather than a pop-up so it works the same on
 * iPhone and in a web browser, and needs the word DELETE typed so it can't happen by accident.
 */
export function DeleteAccount({ userId }: { userId: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      // Signs out at the end, which takes the app back to the sign-in screen.
      await deleteMyAccount(userId);
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <View style={{ gap: 6, marginTop: 8 }}>
        <Button title="Delete account" kind="danger" icon="trash" onPress={() => setOpen(true)} />
        <Text variant="caption" style={{ textAlign: 'center' }}>
          Removes your account and everything in it.
        </Text>
      </View>
    );
  }

  return (
    <Card style={{ gap: 12, borderColor: c.danger }}>
      <Text variant="heading" color={c.danger}>
        Delete your account?
      </Text>
      <View style={{ gap: 6 }}>
        <Text variant="small">This permanently deletes:</Text>
        <Text variant="small">• your sign-in, profile and photo</Text>
        <Text variant="small">• every activity you logged, your points, streaks and achievements</Text>
        <Text variant="small">• your rest days and community memberships</Text>
      </View>
      <Text variant="small">
        Communities you created stay for the other members, and the person who joined first becomes the owner. This
        can’t be undone.
      </Text>
      <Text variant="label">Type {DELETE_CONFIRM_WORD} to confirm</Text>
      <Input
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={DELETE_CONFIRM_WORD}
        accessibilityLabel={`Type ${DELETE_CONFIRM_WORD} to confirm`}
      />
      <ErrorNote message={error} />
      <Button
        title="Permanently delete my account"
        kind="danger"
        onPress={remove}
        loading={busy}
        disabled={!isDeleteConfirmed(typed)}
      />
      <Button
        title="Cancel"
        kind="secondary"
        disabled={busy}
        onPress={() => {
          setOpen(false);
          setTyped('');
          setError(null);
        }}
      />
    </Card>
  );
}
