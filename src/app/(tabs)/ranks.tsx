import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Button, Card, ErrorNote, IconBubble, Input, Loading, Row, Screen, Text } from '../../components/ui';
import { createCommunity, friendlyError, getMyCommunities, getMyProfile, joinCommunity } from '../../lib/api';
import { useUserId } from '../../lib/auth';
import { useLoad } from '../../lib/useLoad';
import { useTheme } from '../../theme/theme';

/** Free accounts can be in this many communities (must match free_community_limit() in the database). */
const FREE_LIMIT = 1;

export default function Ranks() {
  const { c } = useTheme();
  const userId = useUserId();
  const { data, error, reload, refresh, refreshing } = useLoad(async () => {
    const [communities, profile] = await Promise.all([getMyCommunities(), getMyProfile(userId)]);
    return { communities, profile };
  });
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function run(kind: 'create' | 'join') {
    setBusy(kind);
    setFormError(null);
    try {
      const community = kind === 'create' ? await createCommunity(name) : await joinCommunity(code);
      setName('');
      setCode('');
      await reload();
      router.push(`/community/${community.id}`);
    } catch (e) {
      setFormError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  const atLimit = !!data && !data.profile.is_premium && data.communities.length >= FREE_LIMIT;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Text variant="largeTitle">Communities</Text>
      <ErrorNote message={error} />
      {!data ? (
        !error ? <Loading /> : null
      ) : (
        <>
          {data.communities.map((cm) => (
            <Pressable
              key={cm.id}
              onPress={() => router.push(`/community/${cm.id}`)}
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18 }}>
                <IconBubble name="trophy" tone="accent" />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="heading">{cm.name}</Text>
                  <Text variant="small">
                    {cm.community_members[0]?.count ?? 1} members · code {cm.invite_code}
                  </Text>
                </View>
                <Icon name="chevron" size={26} color={c.muted} />
              </Card>
            </Pressable>
          ))}

          {atLimit ? (
            <Card style={{ gap: 4 }}>
              <Row>
                <IconBubble name="lock" size={36} />
                <Text variant="heading" style={{ flex: 1 }}>
                  Want more than one community?
                </Text>
              </Row>
              <Text variant="small">Joining more communities will be part of the paid plan. Coming later.</Text>
            </Card>
          ) : (
            <>
              <Card style={{ gap: 12 }}>
                <Row>
                  <IconBubble name="users" tone="accent" size={36} />
                  <Text variant="heading">Start a community</Text>
                </Row>
                <Text variant="small">Make a private group, then share the invite code with friends.</Text>
                <Input placeholder="Name, e.g. Dorm 4B Crew" value={name} onChangeText={setName} maxLength={40} />
                <Button title="Create" onPress={() => run('create')} loading={busy === 'create'} disabled={name.trim().length < 2} />
              </Card>
              <Card style={{ gap: 12 }}>
                <Row>
                  <IconBubble name="link" size={36} />
                  <Text variant="heading">Join with a code</Text>
                </Row>
                <Input
                  placeholder="6-letter code"
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <Button title="Join" kind="secondary" onPress={() => run('join')} loading={busy === 'join'} disabled={code.trim().length !== 6} />
              </Card>
            </>
          )}
          <ErrorNote message={formError} />
        </>
      )}
    </Screen>
  );
}
