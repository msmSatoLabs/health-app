import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { ActivityTile, Button, Card, Chip, ErrorNote, Loading, ProgressBar, Row, Screen, Stepper, Text, useGridTileWidth } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { SCORING_RULES } from '../../config/scoring';
import { streakHint } from '../../features/streaks/logic';
import { evaluateAchievements, friendlyError, getActivityTypes, getMyStats, getTodayBreakdown, logActivity } from '../../lib/api';
import { estimatePoints, formatAmount, stepper } from '../../lib/activityUi';
import { useLoad } from '../../lib/useLoad';
import { useTheme } from '../../theme/theme';

export default function Log() {
  const tile = useGridTileWidth(4, 10);
  const { c, radius } = useTheme();
  const { data, error } = useLoad(async () => {
    const [types, today, stats] = await Promise.all([getActivityTypes(), getTodayBreakdown(), getMyStats()]);
    return { types, today, stats };
  });
  const [selected, setSelected] = useState<string>('water');
  const [amount, setAmount] = useState(stepper.water.start);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const type = data?.types.find((t) => t.key === selected);

  // Switching activity resets the amount to that activity's starting value.
  function selectType(key: string) {
    setSelected(key);
    setAmount(stepper[key]?.start ?? 1);
    setSaveError(null);
  }

  if (!data || !type) {
    return (
      <Screen>
        <Text variant="largeTitle">Log activity</Text>
        <ErrorNote message={error} />
        {!error ? <Loading /> : null}
      </Screen>
    );
  }

  const step = stepper[type.key]?.step ?? 1;
  const todayRow = data.today.find((d) => d.activity_key === type.key);
  const earned = todayRow?.points ?? 0;
  const preview = estimatePoints(type, amount, todayRow?.amount ?? 0);
  const isHealthType = type.source === 'health';
  const capped = earned >= type.daily_cap;
  const hint = streakHint(data.stats.today_points, preview, SCORING_RULES.streakMinPoints);
  const hintText =
    hint.kind === 'counted'
      ? 'Today already counts for your streak'
      : hint.kind === 'keeps'
        ? 'This keeps your streak going'
        : `${hint.pointsNeeded} more pts today for your streak`;

  async function save() {
    setBusy(true);
    setSaveError(null);
    try {
      await logActivity(type!.key, amount, 'manual');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const fresh = await evaluateAchievements();
      if (fresh.length) {
        Alert.alert('Achievement unlocked', fresh.map((a) => `${a.title}: ${a.description}`).join('\n'));
      }
      router.navigate('/');
    } catch (e) {
      setSaveError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="largeTitle">Log activity</Text>
        <Pressable
          onPress={() => router.navigate('/')}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: c.chipBg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="close" size={20} color={c.ink} />
        </Pressable>
      </Row>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {data.types.map((t) => (
          <ActivityTile
            key={t.key}
            icon={t.icon}
            label={t.label}
            selected={t.key === selected}
            onPress={() => selectType(t.key)}
            width={tile}
          />
        ))}
      </View>

      <Card style={{ gap: 20, paddingVertical: 22 }}>
        <Stepper
          value={Number.isInteger(amount) ? amount.toLocaleString() : amount.toFixed(1)}
          unit={type.unit}
          onLess={() => setAmount((a) => Math.max(step, +(a - step).toFixed(2)))}
          onMore={() => setAmount((a) => Math.min(type.max_per_entry, +(a + step).toFixed(2)))}
          canLess={amount > step}
          canMore={amount < type.max_per_entry}
        />
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="small">Daily cap for {type.label.toLowerCase()}</Text>
            <Text variant="small" style={{ fontVariant: ['tabular-nums'] }}>
              {earned} / {type.daily_cap} pts
            </Text>
          </Row>
          <ProgressBar value={earned} max={type.daily_cap} />
        </View>
      </Card>

      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', paddingHorizontal: 4 }}>
        <Row style={{ gap: 6, flexShrink: 1 }}>
          <Icon name="flame" size={16} color={c.warmInk} />
          <Text variant="caption">{hintText}</Text>
        </Row>
        {isHealthType ? <Chip tone="muted" icon="heart" label="Usually from Apple Health" /> : null}
      </Row>

      {capped ? (
        <Text variant="small">You’ve hit today’s cap for this one. Nice. Rest counts too.</Text>
      ) : null}

      <ErrorNote message={saveError} />
      <Button
        title={`Log ${formatAmount(amount, type.unit)} · +${preview} pts`}
        onPress={save}
        loading={busy}
      />
    </Screen>
  );
}
