import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Avatar, Button, Card, Chip, Divider, ErrorNote, ListRow, Loading, Row, Screen, Section, Segmented, Text } from '../../components/ui';
import {
  friendlyError,
  getActivityTypes,
  getCommunity,
  getFeed,
  getLeaderboard,
  leaveCommunity,
  type LeaderboardPeriod,
} from '../../lib/api';
import { useUserId } from '../../lib/auth';
import { APP_NAME } from '../../lib/config';
import { localDay, seasonLabel, seasonOf, seasonsSince, timeAgo } from '../../lib/dates';
import { useCommunityLive } from '../../lib/useLive';
import { useLoad } from '../../lib/useLoad';
import { useTheme } from '../../theme/theme';

export default function CommunityScreen() {
  const { c, radius } = useTheme();
  const userId = useUserId();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const { data, error, reload, refresh, refreshing } = useLoad(async () => {
    const [community, board, feed, types] = await Promise.all([
      getCommunity(id),
      getLeaderboard(id, period),
      getFeed(id, 15),
      getActivityTypes(),
    ]);
    return { community, board, feed, types, period };
  });
  const [copied, setCopied] = useState(false);

  // Live: refresh the leaderboard and feed whenever a member logs something.
  useCommunityLive([id], reload);

  // Reload when the period changes (the first load happens on focus).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    reload();
  }, [period, reload]);
  const choose = setPeriod;

  if (!data) {
    return (
      <Screen topInset={false}>
        <ErrorNote message={error} />
        {!error ? <Loading /> : null}
      </Screen>
    );
  }

  const { community, board, feed, types } = data;
  const members = community.community_members[0]?.count ?? board.length;
  const inviteLink = Linking.createURL('/join', { queryParams: { code: community.invite_code } });
  const today = localDay();
  const current = seasonOf(today);
  const pastSeasons = seasonsSince(localDay(new Date(community.created_at)), today).filter((s) => s !== current);
  const isPastSeason = period !== 'today' && period !== 'week' && period !== current;
  const segment = isPastSeason ? current : period;

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
      <View style={{ gap: 4 }}>
        <Text variant="largeTitle" numberOfLines={2}>
          {community.name}
        </Text>
        <Row style={{ gap: 8 }}>
          <Text variant="small">
            {members} {members === 1 ? 'member' : 'members'}
          </Text>
          <Chip label="Live" icon="live" />
        </Row>
      </View>

      <Segmented
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'Week' },
          { value: current, label: 'Season' },
        ]}
        value={segment}
        onChange={choose}
      />
      {pastSeasons.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {pastSeasons.map((s) => (
            <Pressable key={s} onPress={() => choose(s)} accessibilityRole="button">
              <Chip label={seasonLabel(s, 'short')} tone={period === s ? 'accent' : 'muted'} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {period !== 'today' && period !== 'week' ? (
        <Text variant="small">
          {period === current ? `${seasonLabel(current)} season so far` : `Final standings, ${seasonLabel(period)}`}
        </Text>
      ) : null}

      <View style={{ gap: 8 }}>
        {board.map((r) => {
          const me = r.user_id === userId;
          return (
            <Pressable
              key={r.user_id}
              onPress={() => router.push(`/member/${r.user_id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Rank ${r.rank}, ${me ? 'you' : r.display_name}, ${r.points} points`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: radius.row,
                backgroundColor: me ? c.accent : c.surface,
                borderWidth: 1,
                borderColor: me ? c.accent : c.cardBorder,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text variant="heading" color={me ? c.onAccent : r.rank === 1 ? c.gold : c.muted} style={{ width: 28 }}>
                {r.rank}
              </Text>
              <Avatar name={r.display_name} url={r.avatar_url} size={40} />
              <Text variant="heading" color={me ? c.onAccent : c.ink} style={{ flex: 1 }} numberOfLines={1}>
                {me ? 'You' : r.display_name}
              </Text>
              <Text variant="heading" color={me ? c.onAccent : c.ink}>
                {r.points.toLocaleString()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Section title="Activity" />
      <Card style={{ gap: 12 }}>
        {feed.length === 0 ? (
          <Text variant="body" color={c.muted}>
            When someone logs an activity, it shows up here right away.
          </Text>
        ) : (
          feed.map((e, i) => {
            const t = e.activity_key ? types.find((x) => x.key === e.activity_key) : undefined;
            const who = e.user_id === userId ? 'You' : e.display_name;
            return (
              <View key={e.id} style={{ gap: 12 }}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  left={<Avatar name={e.display_name} url={e.avatar_url} size={40} />}
                  title={t ? `${who} logged ${t.label.toLowerCase()}` : `${who} earned points`}
                  subtitle={timeAgo(e.created_at)}
                  right={t ? <Icon name={t.icon} size={22} color={c.accent} /> : undefined}
                />
              </View>
            );
          })
        )}
      </Card>

      <Section title="Invite friends" />
      <Card style={{ gap: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="number" style={{ letterSpacing: 4 }}>
            {community.invite_code}
          </Text>
          <Button title={copied ? 'Copied' : 'Copy'} kind="secondary" icon="copy" onPress={copyCode} />
        </Row>
        <Button title="Share invite link" icon="share" onPress={share} />
        <Row style={{ gap: 6 }}>
          <Icon name="link" size={16} color={c.muted} />
          <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
            {inviteLink}
          </Text>
        </Row>
      </Card>

      <Button title="Leave community" kind="danger" onPress={leave} />
    </Screen>
  );
}
