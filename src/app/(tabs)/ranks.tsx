import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Button, Card, ErrorNote, Input, Loading, Row, Screen, Text } from '../../components/ui';
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
      <Text variant="title">Communities</Text>
      <ErrorNote message={error} />
      {!data ? (
        !error ? <Loading /> : null
      ) : (
        <>
          {data.communities.map((cm) => (
            <Pressable key={cm.id} onPress={() => router.push(`/community/${cm.id}`)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="heading">{cm.name}</Text>
                  <Text variant="small">
                    {cm.community_members[0]?.count ?? 1} members · code {cm.invite_code}
                  </Text>
                </View>
                <Icon name="chevron" size={22} color={c.muted} />
              </Card>
            </Pressable>
          ))}

          {atLimit ? (
            <Card style={{ gap: 4 }}>
              <Row>
                <Icon name="lock" size={16} color={c.muted} />
                <Text variant="heading" style={{ fontSize: 14 }}>
                  Want more than one community?
                </Text>
              </Row>
              <Text variant="small">Joining more communities will be part of the paid plan. Coming later.</Text>
            </Card>
          ) : (
            <>
              <Card style={{ gap: 10 }}>
                <Text variant="heading">Start a community</Text>
                <Text variant="small">Make a private group, then share the invite code with friends.</Text>
                <Input placeholder="Name, e.g. Dorm 4B Crew" value={name} onChangeText={setName} maxLength={40} />
                <Button title="Create" onPress={() => run('create')} loading={busy === 'create'} disabled={name.trim().length < 2} />
              </Card>
              <Card style={{ gap: 10 }}>
                <Text variant="heading">Join with a code</Text>
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
