import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ring } from '../../components/Ring';
import {
  Avatar,
  AvatarStack,
  Button,
  Card,
  Chip,
  Divider,
  ErrorNote,
  FeatureCard,
  IconBubble,
  ListRow,
  Loading,
  MiniStat,
  ProgressBar,
  Row,
  Screen,
  Section,
  Text,
} from '../../components/ui';
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

  const firstName = profile.display_name.trim().split(/\s+/)[0] || 'there';
  const goalMet = stats.today_points >= stats.daily_goal;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text variant="small">{dateLabel}</Text>
          <Text variant="title" numberOfLines={1}>
            Hey, {firstName}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/you')} accessibilityRole="button" accessibilityLabel="Your profile">
          <Avatar name={profile.display_name} url={profile.avatar_url} size={44} highlight />
        </Pressable>
      </Row>

      <Row style={{ gap: 20 }}>
        <Ring value={stats.today_points} max={stats.daily_goal} size={156} stroke={16} />
        <View style={{ flex: 1, gap: 14 }}>
          <MiniStat
            icon="flame"
            tone="warm"
            value={`${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`}
            label={stats.rest_day_today ? 'Streak · rest day' : 'Streak'}
          />
          <MiniStat
            icon="target"
            value={goalMet ? 'Goal hit' : `${left} to go`}
            label={goalMet ? 'Nice work today' : 'To your daily goal'}
          />
          <MiniStat icon="bolt" value={stats.week_points.toLocaleString()} label="Last 7 days" />
        </View>
      </Row>

      {community ? (
        <Pressable
          onPress={() => router.push(`/community/${community.id}`)}
          accessibilityRole="button"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Card style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="label">This week</Text>
              <Chip label="Live" icon="live" />
            </Row>
            <Row style={{ gap: 14 }}>
              <Text variant="number" color={c.accent} style={{ fontSize: type.hero }}>
                #{me?.rank ?? '–'}
              </Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="heading" numberOfLines={1}>
                  {community.name}
                </Text>
                <Text variant="small" numberOfLines={1}>
                  {ahead && me
                    ? `${ahead.points - me.points} pts behind ${ahead.display_name}`
                    : board.length > 1
                      ? "You're in first"
                      : 'Invite friends to compete'}
                </Text>
              </View>
              <AvatarStack people={board.slice(0, 3).map((r) => ({ id: r.user_id, name: r.display_name, url: r.avatar_url }))} />
            </Row>
          </Card>
        </Pressable>
      ) : (
        <Pressable onPress={() => router.push('/ranks')} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <FeatureCard
            label="Better with friends"
            title="Start or join a community"
            body="Compete on a private leaderboard with your friends."
          />
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
                    left={<IconBubble name={t.icon} tone="activity" />}
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
