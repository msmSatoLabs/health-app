import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ring } from '../../components/Ring';
import { Avatar, Button, Card, Chip, Divider, ErrorNote, IconBubble, ListRow, Loading, ProgressBar, Row, Screen, Section, Text } from '../../components/ui';
import { syncToday } from '../../health';
import {
  evaluateAchievements,
  friendlyError,
  getActivityTypes,
  getLeaderboard,
  getMyCommunities,
  getMyProfile,
  getMyStats,
  getTodayBreakdown,
} from '../../lib/api';
import { formatAmount } from '../../lib/activityUi';
import { useUserId } from '../../lib/auth';
import { useCommunityLive } from '../../lib/useLive';
import { useLoad } from '../../lib/useLoad';
import { useTheme } from '../../theme/theme';

async function loadHome(userId: string) {
  const [profile, stats, breakdown, types, communities] = await Promise.all([
    getMyProfile(userId),
    getMyStats(),
    getTodayBreakdown(),
    getActivityTypes(),
    getMyCommunities(),
  ]);
  const community = communities[0] ?? null;
  const board = community ? await getLeaderboard(community.id, 'week') : [];
  return { profile, stats, breakdown, types, community, board };
}

export default function Home() {
  const { c, type } = useTheme();
  const userId = useUserId();
  const { data, error, reload, refresh, refreshing } = useLoad(() => loadHome(userId));
  // Live: your rank updates when someone in your community logs something.
  useCommunityLive(data?.community ? [data.community.id] : [], reload);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setSyncNote(null);
    try {
      const source = await syncToday();
      if (source) {
        await evaluateAchievements();
        setSyncNote(`Synced from ${source}.`);
        await reload();
      } else {
        setSyncNote('Apple Health needs the full app build. For now, log activities with the + button.');
      }
    } catch (e) {
      setSyncNote(friendlyError(e));
    } finally {
      setSyncing(false);
    }
  }

  if (!data) {
    return (
      <Screen>
        <ErrorNote message={error} />
        {!error ? <Loading /> : <Button title="Try again" kind="secondary" onPress={reload} />}
      </Screen>
    );
  }

  const { profile, stats, breakdown, types, community, board } = data;
  const me = board.find((r) => r.user_id === userId);
  const ahead = me ? board.filter((r) => r.points > me.points).at(-1) : undefined;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const left = Math.max(0, stats.daily_goal - stats.today_points);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text variant="label">{dateLabel}</Text>
          <Text variant="largeTitle">Summary</Text>
        </View>
        <Pressable onPress={() => router.push('/you')} accessibilityRole="button" accessibilityLabel="Your profile">
          <Avatar name={profile.display_name} url={profile.avatar_url} size={44} highlight />
        </Pressable>
      </Row>

      <Card style={{ alignItems: 'center', gap: 16, paddingVertical: 24 }}>
        <Text variant="heading">Daily points</Text>
        <Ring value={stats.today_points} max={stats.daily_goal} />
        <Text variant="body" color={c.muted}>
          {left > 0 ? `${left} more ${left === 1 ? 'point' : 'points'} to hit your goal` : 'Goal reached. Nice work.'}
        </Text>
      </Card>

      <Row style={{ gap: 10 }}>
        <Card style={{ flex: 1, gap: 6 }}>
          <IconBubble name="flame" tone="warm" size={36} />
          <Text variant="number">{stats.streak}</Text>
          <Text variant="small">Day streak</Text>
        </Card>
        <Card style={{ flex: 1, gap: 6 }}>
          <IconBubble name="bolt" tone="accent" size={36} />
          <Text variant="number">{stats.week_points}</Text>
          <Text variant="small">Last 7 days</Text>
        </Card>
      </Row>

      {community ? (
        <Pressable onPress={() => router.push(`/community/${community.id}`)} accessibilityRole="button">
          <Card style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="label">{community.name} · this week</Text>
              <Chip label="Live" icon="live" />
            </Row>
            <Row style={{ gap: 14 }}>
              <Text variant="number" color={c.accent} style={{ fontSize: type.hero }}>
                #{me?.rank ?? '–'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text variant="body">
                  {ahead && me
                    ? `${ahead.points - me.points} pts behind ${ahead.display_name}`
                    : board.length > 1
                      ? "You're in first"
                      : 'Invite friends to compete'}
                </Text>
              </View>
              <Row style={{ gap: 0 }}>
                {board.slice(0, 3).map((r, i) => (
                  <View key={r.user_id} style={{ marginLeft: i ? -10 : 0, borderWidth: 2, borderColor: c.surface, borderRadius: 99 }}>
                    <Avatar name={r.display_name} url={r.avatar_url} size={32} />
                  </View>
                ))}
              </Row>
            </Row>
          </Card>
        </Pressable>
      ) : (
        <Pressable onPress={() => router.push('/ranks')} accessibilityRole="button">
          <Card style={{ backgroundColor: c.featureBg, borderColor: c.featureBg, gap: 6 }}>
            <Text variant="label" color={c.featureInk} style={{ opacity: 0.75 }}>
              Better with friends
            </Text>
            <Text variant="heading" color={c.featureInk}>
              Start or join a community
            </Text>
            <Text variant="small" color={c.featureInk} style={{ opacity: 0.8 }}>
              Compete on a private leaderboard with your friends.
            </Text>
          </Card>
        </Pressable>
      )}

      <Section title="Today" action={syncing ? 'Syncing…' : 'Sync health'} onAction={syncing ? undefined : sync} />
      {syncNote ? <Text variant="small">{syncNote}</Text> : null}

      {breakdown.length === 0 ? (
        <Card style={{ gap: 14, alignItems: 'flex-start' }}>
          <Text variant="body" color={c.muted}>
            Nothing logged yet today. Tap + to add water, a meal, study time and more.
          </Text>
          <Button title="Log an activity" icon="plus" onPress={() => router.push('/log')} />
        </Card>
      ) : (
        <Card style={{ gap: 14 }}>
          {types
            .filter((t) => breakdown.some((b) => b.activity_key === t.key))
            .map((t, i) => {
              const b = breakdown.find((x) => x.activity_key === t.key)!;
              return (
                <View key={t.key} style={{ gap: 14 }}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    left={<IconBubble name={t.icon} tone="accent" />}
                    title={t.label}
                    subtitle={formatAmount(Number(b.amount), t.unit)}
                    right={
                      <Text variant="heading" color={c.accent}>
                        +{b.points}
                      </Text>
                    }
                  />
                  <View style={{ gap: 4 }}>
                    <ProgressBar value={b.points} max={t.daily_cap} />
                    <Text variant="caption">
                      {b.points >= t.daily_cap ? 'Daily cap reached' : `${b.points} of ${t.daily_cap} pts possible today`}
                    </Text>
                  </View>
                </View>
              );
            })}
        </Card>
      )}
    </Screen>
  );
}
