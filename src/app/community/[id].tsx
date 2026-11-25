import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Avatar, Button, Card, ErrorNote, Loading, Row, Screen, Segmented, Text } from '../../components/ui';
import { friendlyError, getCommunity, getLeaderboard, leaveCommunity, type LeaderboardPeriod } from '../../lib/api';
import { useUserId } from '../../lib/auth';
import { APP_NAME } from '../../lib/config';
import { useLoad } from '../../lib/useLoad';
import { useTheme } from '../../theme/theme';

export default function CommunityScreen() {
  const { c, radius } = useTheme();
  const userId = useUserId();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const { data, error, refresh, refreshing } = useLoad(async () => {
    const [community, week, today] = await Promise.all([
      getCommunity(id),
      getLeaderboard(id, 'week'),
      getLeaderboard(id, 'today'),
    ]);
    return { community, week, today };
  });
  const [copied, setCopied] = useState(false);

  if (!data) {
    return (
      <Screen topInset={false}>
        <ErrorNote message={error} />
        {!error ? <Loading /> : null}
      </Screen>
    );
  }

  const { community } = data;
  const board = period === 'week' ? data.week : data.today;
  const members = community.community_members[0]?.count ?? board.length;
  const inviteLink = Linking.createURL('/join', { queryParams: { code: community.invite_code } });

  async function copyCode() {
    await Clipboard.setStringAsync(community.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function share() {
    Share.share({
      message: `Join "${community.name}" on ${APP_NAME}! Code: ${community.invite_code}\n${inviteLink}`,
    });
  }

  function leave() {
    Alert.alert(`Leave ${community.name}?`, 'You can rejoin later with the invite code.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveCommunity(community.id, userId);
            router.replace('/ranks');
          } catch (e) {
            Alert.alert('Could not leave', friendlyError(e));
          }
        },
      },
    ]);
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} topInset={false}>
      <Stack.Screen options={{ title: '' }} />
      <View>
        <Text variant="small">
          {community.name} · {members} {members === 1 ? 'member' : 'members'}
        </Text>
        <Text variant="title">Leaderboard</Text>
      </View>

      <Segmented
        options={[
          { value: 'week', label: 'This week' },
          { value: 'today', label: 'Today' },
        ]}
        value={period}
        onChange={setPeriod}
      />

      <View style={{ gap: 6 }}>
        {board.map((r) => {
          const me = r.user_id === userId;
          return (
            <View
              key={r.user_id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 9,
                paddingHorizontal: 12,
                borderRadius: radius.row,
                backgroundColor: me ? c.accent : c.surface,
                borderWidth: 1,
                borderColor: me ? c.accent : c.cardBorder,
              }}
            >
              <Text variant="heading" color={me ? c.onAccent : r.rank === 1 ? c.gold : c.muted} style={{ width: 22, fontSize: 13 }}>
                {r.rank}
              </Text>
              <Avatar name={r.display_name} size={28} />
              <Text variant="heading" color={me ? c.onAccent : c.ink} style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>
                {me ? 'You' : r.display_name}
              </Text>
              <Text variant="heading" color={me ? c.onAccent : c.ink} style={{ fontSize: 14 }}>
                {r.points.toLocaleString()}
              </Text>
            </View>
          );
        })}
      </View>

      <Card style={{ gap: 12, marginTop: 8 }}>
        <Text variant="label">Invite friends</Text>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="number" style={{ letterSpacing: 4 }}>
            {community.invite_code}
          </Text>
          <Button title={copied ? 'Copied' : 'Copy'} kind="secondary" icon="copy" onPress={copyCode} />
        </Row>
        <Button title="Share invite link" icon="share" onPress={share} />
        <Row style={{ gap: 6 }}>
          <Icon name="link" size={14} color={c.muted} />
          <Text variant="small" style={{ flex: 1 }} numberOfLines={1}>
            {inviteLink}
          </Text>
        </Row>
      </Card>

      <Button title="Leave community" kind="danger" onPress={leave} />
    </Screen>
  );
}
