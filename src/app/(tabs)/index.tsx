import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ring } from '../../components/Ring';
import { Avatar, Button, Card, Chip, ErrorNote, IconBubble, Loading, Row, Screen, Text } from '../../components/ui';
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
  const { c } = useTheme();
  const userId = useUserId();
  const { data, error, reload, refresh, refreshing } = useLoad(() => loadHome(userId));
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
  const firstName = profile.display_name.split(' ')[0];
  const me = board.find((r) => r.user_id === userId);
  const ahead = me ? board.filter((r) => r.points > me.points).at(-1) : undefined;
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <Text variant="small">{today}</Text>
          <Text variant="title">Hey, {firstName}</Text>
        </View>
        <Pressable onPress={() => router.push('/you')}>
          <Avatar name={profile.display_name} highlight />
        </Pressable>
      </Row>

      <Row style={{ gap: 16 }}>
        <Ring value={stats.today_points} max={stats.daily_goal} />
        <View style={{ gap: 10, flex: 1 }}>
          <Row>
            <IconBubble name="flame" tone="warm" size={30} />
            <View>
              <Text variant="heading">
                {stats.streak} {stats.streak === 1 ? 'day' : 'days'}
              </Text>
              <Text variant="small">Streak</Text>
            </View>
          </Row>
          <Row>
            <IconBubble name="bolt" tone="accent" size={30} />
            <View>
              <Text variant="heading">{stats.week_points} pts</Text>
              <Text variant="small">Last 7 days</Text>
            </View>
          </Row>
        </View>
      </Row>

      {community ? (
        <Pressable onPress={() => router.push(`/community/${community.id}`)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text variant="number" color={c.accent} style={{ fontSize: 30 }}>
              #{me?.rank ?? '–'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text variant="heading" numberOfLines={1}>
                {community.name}
              </Text>
              <Text variant="small">
                {ahead && me ? `${ahead.points - me.points} pts behind ${ahead.display_name}` : board.length > 1 ? "You're in first this week" : 'Invite friends to compete'}
              </Text>
            </View>
            <Row style={{ gap: 0 }}>
              {board.slice(0, 3).map((r, i) => (
                <View key={r.user_id} style={{ marginLeft: i ? -8 : 0, borderWidth: 2, borderColor: c.surface, borderRadius: 99 }}>
                  <Avatar name={r.display_name} size={24} />
                </View>
              ))}
            </Row>
          </Card>
        </Pressable>
      ) : (
        <Pressable onPress={() => router.push('/ranks')}>
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

      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <Text variant="label">Today</Text>
        <Pressable onPress={sync} disabled={syncing} hitSlop={8}>
          <Chip label={syncing ? 'Syncing…' : 'Sync health'} icon="sync" />
        </Pressable>
      </Row>
      {syncNote ? <Text variant="small">{syncNote}</Text> : null}

      {breakdown.length === 0 ? (
        <Card style={{ gap: 10, alignItems: 'flex-start' }}>
          <Text variant="body" color={c.muted}>
            Nothing logged yet today. Tap + to add water, a meal, study time and more.
          </Text>
          <Button title="Log an activity" icon="plus" onPress={() => router.push('/log')} />
        </Card>
      ) : (
        <Card style={{ gap: 12 }}>
          {types
            .filter((t) => breakdown.some((b) => b.activity_key === t.key))
            .map((t) => {
              const b = breakdown.find((x) => x.activity_key === t.key)!;
              return (
                <Row key={t.key}>
                  <IconBubble name={t.icon} />
                  <View style={{ flex: 1 }}>
                    <Text variant="heading" style={{ fontSize: 14 }}>
                      {t.label}
                    </Text>
                    <Text variant="small">
                      {formatAmount(Number(b.amount), t.unit)} · cap {t.daily_cap}
                    </Text>
                  </View>
                  <Text variant="heading" color={c.accent}>
                    +{b.points}
                  </Text>
                </Row>
              );
            })}
        </Card>
      )}
    </Screen>
  );
}
