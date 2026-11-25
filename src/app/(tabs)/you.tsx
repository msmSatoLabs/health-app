import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { BarChart } from '../../components/BarChart';
import { Icon } from '../../components/Icon';
import {
  Avatar,
  Card,
  Divider,
  ErrorNote,
  IconBubble,
  ListRow,
  Loading,
  Row,
  Screen,
  Section,
  Segmented,
  Text,
  useGridTileWidth,
} from '../../components/ui';
import {
  deleteLog,
  friendlyError,
  getAchievements,
  getActivityTypes,
  getAllDailyPoints,
  getHistory,
  getMyAchievements,
  getMyProfile,
  getMyStats,
  getRecentLogs,
} from '../../lib/api';
import { formatAmount } from '../../lib/activityUi';
import { useUserId } from '../../lib/auth';
import { addDays, localDay, prettyDay, seasonLabel, shortDate } from '../../lib/dates';
import { activityTrends, rangeSummary, seasonSummaries, type HistoryRange } from '../../lib/history';
import type { Achievement, ActivityType, UserAchievement } from '../../lib/types';
import { useLoad } from '../../lib/useLoad';
import { useTheme } from '../../theme/theme';

type RangeView = HistoryRange | 'seasons';

export default function You() {
  const { c } = useTheme();
  const userId = useUserId();
  const { data, error, reload, refresh, refreshing } = useLoad(async () => {
    const [profile, stats, daily, achievements, mine, logs, types, recent] = await Promise.all([
      getMyProfile(userId),
      getMyStats(),
      getAllDailyPoints(),
      getAchievements(),
      getMyAchievements(),
      getRecentLogs(30),
      getActivityTypes(),
      getHistory(35),
    ]);
    return { profile, stats, daily, achievements, mine, logs, types, recent };
  });
  const [range, setRange] = useState<RangeView>('week');
  const [actionError, setActionError] = useState<string | null>(null);

  if (!data) {
    return (
      <Screen>
        <Text variant="largeTitle">You</Text>
        <ErrorNote message={error} />
        {!error ? <Loading /> : null}
      </Screen>
    );
  }

  const { profile, stats, daily, achievements, mine, logs, types, recent } = data;
  const today = localDay();
  const seasons = seasonSummaries(daily, today, stats.daily_goal);
  const trends = activityTrends(recent, today);

  function removeLog(id: string) {
    Alert.alert('Delete this entry?', 'Its points will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLog(id);
            await reload();
          } catch (e) {
            setActionError(friendlyError(e));
          }
        },
      },
    ]);
  }

  const byDay = new Map<string, typeof logs>();
  for (const l of logs) byDay.set(l.day, [...(byDay.get(l.day) ?? []), l]);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="largeTitle">You</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityRole="button">
          <Text variant="body" color={c.accent}>
            Edit profile
          </Text>
        </Pressable>
      </Row>

      <Row style={{ gap: 16 }}>
        <Avatar name={profile.display_name} url={profile.avatar_url} size={76} highlight />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" numberOfLines={1}>
            {profile.display_name}
          </Text>
          <Text variant="small">{stats.lifetime_points.toLocaleString()} points all time</Text>
        </View>
      </Row>

      <Row style={{ gap: 10 }}>
        <StatTile value={String(stats.streak)} label="Day streak" icon="flame" />
        <StatTile value={String(seasons[0]?.points ?? 0)} label="This season" icon="trophy" />
        <StatTile value={String(new Set(mine.map((m) => m.achievement_key)).size)} label="Badges" icon="star" />
      </Row>

      <Section title="History" />
      <Segmented
        options={[
          { value: 'week', label: 'W' },
          { value: 'month', label: 'M' },
          { value: 'year', label: 'Y' },
          { value: 'seasons', label: 'Seasons' },
        ]}
        value={range}
        onChange={setRange}
      />
      {range === 'seasons' ? (
        <View style={{ gap: 10 }}>
          {seasons.map((s) => (
            <Card key={s.season} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="heading">{seasonLabel(s.season)}</Text>
                {s.current ? <Text variant="label" color={c.accent}>Current</Text> : null}
              </Row>
              <Row style={{ alignItems: 'baseline', gap: 6 }}>
                <Text variant="number">{s.points.toLocaleString()}</Text>
                <Text variant="small">pts</Text>
              </Row>
              <Text variant="small">
                {s.activeDays} active {s.activeDays === 1 ? 'day' : 'days'} · goal hit {s.goalDays}{' '}
                {s.goalDays === 1 ? 'time' : 'times'}
              </Text>
            </Card>
          ))}
          <Text variant="caption">A season is one calendar month. Community standings start fresh each season.</Text>
        </View>
      ) : (
        <HistoryChart range={range} summary={rangeSummary(range, daily, today, stats.daily_goal)} goal={stats.daily_goal} />
      )}

      <Section title="Trends" />
      <Text variant="small">Your daily average over the last 7 days, compared with the 4 weeks before.</Text>
      <Card style={{ gap: 12 }}>
        {trends.length === 0 ? (
          <Text variant="body" color={c.muted}>
            Log a few days of activity and your trends will show up here.
          </Text>
        ) : (
          trends
            .map((t) => ({ t, type: types.find((x) => x.key === t.activityKey) }))
            .filter((x): x is { t: (typeof trends)[number]; type: ActivityType } => !!x.type)
            .sort((a, b) => a.type.sort_order - b.type.sort_order)
            .map(({ t, type }, i) => (
              <View key={t.activityKey} style={{ gap: 12 }}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  left={<IconBubble name={type.icon} tone="accent" />}
                  title={type.label}
                  subtitle={`${formatAvg(t.recent, type.unit)} a day${
                    t.direction === 'new' ? ' · new this week' : ` · was ${formatAvg(t.baseline, type.unit)}`
                  }`}
                  right={<TrendBadge direction={t.direction} />}
                />
              </View>
            ))
        )}
      </Card>

      <Section title="Achievements" />
      <AchievementGrid achievements={achievements} mine={mine} />

      <Section title="Recent activity" />
      {logs.length === 0 ? <Text variant="body" color={c.muted}>Nothing logged yet.</Text> : null}
      {[...byDay.entries()].map(([day, entries]) => (
        <Card key={day} style={{ gap: 12 }}>
          <Text variant="label">{prettyDay(day, today)}</Text>
          {entries.map((l, i) => {
            const t = types.find((x) => x.key === l.activity_key);
            return (
              <View key={l.id} style={{ gap: 12 }}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  left={<IconBubble name={t?.icon ?? 'star'} />}
                  title={t?.label ?? l.activity_key}
                  subtitle={`${formatAmount(Number(l.amount), t?.unit ?? '')} · ${l.source === 'health' ? 'synced' : 'by hand'}`}
                  right={
                    l.source === 'manual' && day >= addDays(today, -1) ? (
                      <Pressable onPress={() => removeLog(l.id)} hitSlop={10} accessibilityLabel="Delete entry">
                        <Icon name="trash" size={22} color={c.muted} />
                      </Pressable>
                    ) : undefined
                  }
                />
              </View>
            );
          })}
        </Card>
      ))}
      <ErrorNote message={actionError} />
    </Screen>
  );
}

function StatTile({ value, label, icon }: { value: string; label: string; icon: string }) {
  const { c } = useTheme();
  return (
    <Card style={{ flex: 1, gap: 4, padding: 14 }}>
      <Icon name={icon} size={20} color={c.accent} />
      <Text variant="number">{value}</Text>
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

function HistoryChart({
  range,
  summary,
  goal,
}: {
  range: HistoryRange;
  summary: ReturnType<typeof rangeSummary>;
  goal: number;
}) {
  const caption = range === 'week' ? 'Last 7 days' : range === 'month' ? 'Last 30 days' : 'Last 12 months';
  return (
    <Card style={{ gap: 16 }}>
      <Row style={{ gap: 24 }}>
        <View>
          <Text variant="label">Daily average</Text>
          <Row style={{ alignItems: 'baseline', gap: 4 }}>
            <Text variant="number">{summary.perDay}</Text>
            <Text variant="small">pts</Text>
          </Row>
        </View>
        <View>
          <Text variant="label">Total</Text>
          <Text variant="number">{summary.total.toLocaleString()}</Text>
        </View>
        <View>
          <Text variant="label">Goal days</Text>
          <Text variant="number">{summary.goalDays}</Text>
        </View>
      </Row>
      <Text variant="caption">{caption}</Text>
      <BarChart bars={summary.bars} goal={range === 'year' ? undefined : goal} labelEvery={summary.labelEvery} />
    </Card>
  );
}

function TrendBadge({ direction }: { direction: 'up' | 'down' | 'steady' | 'new' }) {
  const { c } = useTheme();
  const icon = direction === 'up' ? 'trendUp' : direction === 'down' ? 'trendDown' : direction === 'new' ? 'star' : 'trendFlat';
  const color = direction === 'down' ? c.warmInk : direction === 'steady' ? c.muted : c.accent;
  return <Icon name={icon} size={26} color={color} />;
}

function formatAvg(n: number, unit: string) {
  const v = n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
  return formatAmount(v, unit);
}

function AchievementGrid({ achievements, mine }: { achievements: Achievement[]; mine: UserAchievement[] }) {
  const { c, radius } = useTheme();
  const tile = useGridTileWidth(3, 10);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {achievements.map((a) => {
        const earned = mine.filter((m) => m.achievement_key === a.key);
        const has = earned.length > 0;
        const pts = a.bonus_points ?? 0;
        const last = earned.at(-1);
        const when = has
          ? `${a.kind === 'daily' && earned.length > 1 ? `${earned.length}× · last ` : ''}${shortDate(last!.earned_at)}`
          : 'Locked';
        return (
          <Pressable
            key={a.key}
            accessibilityRole="button"
            accessibilityLabel={`${a.title}. ${has ? `Earned ${when}` : 'Not earned yet'}. ${pts} points.`}
            onPress={() =>
              Alert.alert(
                a.title,
                `${a.description}${a.kind === 'daily' ? ' (can be earned every day)' : ''}\n\n+${pts} pts${
                  has ? `\nEarned ${earned.length > 1 ? `${earned.length} times, most recently` : ''} ${shortDate(last!.earned_at)}` : ''
                }`,
              )
            }
            style={{
              width: tile,
              alignItems: 'center',
              gap: 6,
              paddingVertical: 16,
              paddingHorizontal: 6,
              borderRadius: radius.badge,
              backgroundColor: has ? c.accentSoft : c.surface,
              borderWidth: 1,
              borderColor: has ? c.accentSoft : c.cardBorder,
            }}
          >
            <View style={{ opacity: has ? 1 : 0.45 }}>
              <Icon name={has ? a.icon : 'lock'} size={34} color={has ? c.accentInk : c.muted} />
            </View>
            <Text variant="body" numberOfLines={1} color={has ? c.accentInk : c.ink} style={{ textAlign: 'center' }}>
              {a.title}
            </Text>
            <Text variant="caption" color={has ? c.accentInk : c.muted} numberOfLines={1}>
              +{pts} pts
            </Text>
            <Text variant="caption" numberOfLines={1} style={{ textAlign: 'center' }}>
              {when}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
