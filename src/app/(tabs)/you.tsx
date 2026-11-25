import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { useGridTileWidth, Avatar, Button, Card, ErrorNote, IconBubble, Input, Loading, Row, Screen, Text } from '../../components/ui';
import {
  deleteLog,
  friendlyError,
  getAchievements,
  getActivityTypes,
  getDailyPoints,
  getMyAchievements,
  getMyProfile,
  getMyStats,
  getRecentLogs,
  updateDisplayName,
} from '../../lib/api';
import { formatAmount } from '../../lib/activityUi';
import { useUserId } from '../../lib/auth';
import { addDays, localDay, prettyDay, shortWeekday } from '../../lib/dates';
import { useLoad } from '../../lib/useLoad';
import { useTheme } from '../../theme/theme';

export default function You() {
  const tile = useGridTileWidth();
  const { c, radius } = useTheme();
  const userId = useUserId();
  const { data, error, reload, refresh, refreshing } = useLoad(async () => {
    const [profile, stats, week, achievements, mine, logs, types] = await Promise.all([
      getMyProfile(userId),
      getMyStats(),
      getDailyPoints(7),
      getAchievements(),
      getMyAchievements(),
      getRecentLogs(40),
      getActivityTypes(),
    ]);
    return { profile, stats, week, achievements, mine, logs, types };
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  if (!data) {
    return (
      <Screen>
        <ErrorNote message={error} />
        {!error ? <Loading /> : null}
      </Screen>
    );
  }

  const { profile, stats, week, achievements, mine, logs, types } = data;
  const today = localDay();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const maxDay = Math.max(stats.daily_goal, ...week.map((d) => d.points));
  const badgeCount = mine.length;

  async function saveName() {
    try {
      if (name.trim().length < 1) return;
      await updateDisplayName(userId, name);
      setEditing(false);
      await reload();
    } catch (e) {
      setActionError(friendlyError(e));
    }
  }

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

  // Group recent entries by day for the history list.
  const byDay = new Map<string, typeof logs>();
  for (const l of logs) byDay.set(l.day, [...(byDay.get(l.day) ?? []), l]);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={{ alignItems: 'center', gap: 6, paddingTop: 4 }}>
        <Avatar name={profile.display_name} size={72} highlight />
        {editing ? (
          <Row style={{ marginTop: 6 }}>
            <Input value={name} onChangeText={setName} maxLength={40} autoFocus style={{ minWidth: 180 }} />
            <Button title="Save" onPress={saveName} />
          </Row>
        ) : (
          <Pressable
            onPress={() => {
              setName(profile.display_name);
              setEditing(true);
            }}
          >
            <Row style={{ gap: 6 }}>
              <Text variant="title" style={{ fontSize: 20 }}>
                {profile.display_name}
              </Text>
              <Icon name="pencil" size={16} color={c.muted} />
            </Row>
          </Pressable>
        )}
        <Text variant="small">{stats.lifetime_points.toLocaleString()} points all time</Text>
      </View>

      <Row style={{ gap: 8 }}>
        {[
          [String(stats.streak), 'Day streak'],
          [String(badgeCount), 'Badges'],
          [String(stats.week_points), 'Pts this week'],
        ].map(([n, l]) => (
          <Card key={l} style={{ flex: 1, alignItems: 'center', padding: 10 }}>
            <Text variant="number" style={{ fontSize: 18 }}>
              {n}
            </Text>
            <Text variant="small" style={{ fontSize: 10 }}>
              {l}
            </Text>
          </Card>
        ))}
      </Row>

      <Card style={{ gap: 10 }}>
        <Text variant="label">This week</Text>
        <Row style={{ alignItems: 'flex-end', height: 70, gap: 6 }}>
          {days.map((d) => {
            const pts = week.find((w) => w.day === d)?.points ?? 0;
            const hit = pts >= stats.daily_goal;
            return (
              <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end', height: '100%' }}>
                <View
                  style={{
                    width: '100%',
                    height: Math.max(4, (pts / maxDay) * 50),
                    borderRadius: 6,
                    backgroundColor: hit ? c.accent : pts > 0 ? c.accentSoft : c.track,
                  }}
                />
                <Text variant="small" style={{ fontSize: 9 }}>
                  {shortWeekday(d)}
                </Text>
              </View>
            );
          })}
        </Row>
      </Card>

      <Text variant="label" style={{ marginTop: 4 }}>
        Achievements
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {achievements.map((a) => {
          const earned = mine.filter((m) => m.achievement_key === a.key);
          const has = earned.length > 0;
          return (
            <Pressable
              key={a.key}
              onPress={() =>
                Alert.alert(
                  a.title,
                  `${a.description}${a.kind === 'daily' ? ' (can be earned every day)' : ''}${
                    has ? `\n\nEarned ${a.kind === 'daily' ? `${earned.length}×` : ''}` : ''
                  }`,
                )
              }
              style={{
                width: tile,
                aspectRatio: 1,
                borderRadius: radius.badge,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                backgroundColor: has ? c.accentSoft : c.chipBg,
                opacity: has ? 1 : 0.6,
              }}
            >
              <Icon name={has ? a.icon : 'lock'} size={24} color={has ? c.accentInk : c.muted} />
              <Text variant="small" style={{ fontSize: 10, textAlign: 'center' }} color={has ? c.accentInk : c.muted} numberOfLines={1}>
                {a.title}
                {a.kind === 'daily' && earned.length > 1 ? ` ×${earned.length}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="label" style={{ marginTop: 4 }}>
        History
      </Text>
      {logs.length === 0 ? <Text variant="small">Nothing logged yet.</Text> : null}
      {[...byDay.entries()].map(([day, entries]) => (
        <Card key={day} style={{ gap: 10 }}>
          <Text variant="heading" style={{ fontSize: 14 }}>
            {prettyDay(day, today)}
          </Text>
          {entries.map((l) => {
            const t = types.find((x) => x.key === l.activity_key);
            return (
              <Row key={l.id}>
                <IconBubble name={t?.icon ?? 'star'} size={30} />
                <View style={{ flex: 1 }}>
                  <Text variant="body">{t?.label ?? l.activity_key}</Text>
                  <Text variant="small">
                    {formatAmount(Number(l.amount), t?.unit ?? '')} · {l.source === 'health' ? 'synced' : 'by hand'}
                  </Text>
                </View>
                {l.source === 'manual' && day >= addDays(today, -1) ? (
                  <Pressable onPress={() => removeLog(l.id)} hitSlop={8} accessibilityLabel="Delete entry">
                    <Icon name="trash" size={18} color={c.muted} />
                  </Pressable>
                ) : null}
              </Row>
            );
          })}
        </Card>
      ))}

      <ErrorNote message={actionError} />
    </Screen>
  );
}
