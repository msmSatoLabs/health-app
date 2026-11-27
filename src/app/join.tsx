import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, ErrorNote, Loading, Screen, Text } from '../components/ui';
import { friendlyError, joinCommunity } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../theme/theme';

/** Opened from an invite link like  <scheme>://join?code=ABC123 */
export default function Join() {
  const { c } = useTheme();
  const { session } = useAuth();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !code) return;
    joinCommunity(code)
      .then((community) => router.replace(`/community/${community.id}`))
      .catch((e) => setError(friendlyError(e)));
  }, [session, code]);

  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Screen>
      <View style={{ marginTop: 32 }} />
      {error || !code ? (
        <Card style={{ gap: 12 }}>
          <Text variant="heading">Couldn’t join</Text>
          <ErrorNote message={error ?? 'This invite link is missing its code.'} />
          <Button title="Go to my communities" kind="secondary" onPress={() => router.replace('/ranks')} />
        </Card>
      ) : (
        <>
          <Text variant="body" color={c.muted} style={{ textAlign: 'center' }}>
            Joining with code {code}…
          </Text>
          <Loading />
        </>
      )}
    </Screen>
  );
}
