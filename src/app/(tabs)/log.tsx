import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useGridTileWidth, Button, Card, Chip, ErrorNote, Loading, ProgressBar, Row, Screen, Text } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { evaluateAchievements, friendlyError, getActivityTypes, getTodayBreakdown, logActivity } from '../../lib/api';
import { estimatePoints, formatAmount, stepper } from '../../lib/activityUi';
import { useLoad } from '../../lib/useLoad';
import { useTheme } from '../../theme/theme';

export default function Log() {
  const tile = useGridTileWidth(4, 10);
  const { c, radius, type: typeScale } = useTheme();
  const { data, error } = useLoad(async () => {
    const [types, today] = await Promise.all([getActivityTypes(), getTodayBreakdown()]);
    return { types, today };
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
      <Text variant="largeTitle">Log activity</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {data.types.map((t) => {
          const on = t.key === selected;
          return (
            <Pressable
              key={t.key}
              onPress={() => selectType(t.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{
                width: tile,
                alignItems: 'center',
                gap: 8,
                paddingVertical: 16,
                borderRadius: radius.tile,
                backgroundColor: on ? c.accent : c.surface,
                borderWidth: 1,
                borderColor: on ? c.accent : c.cardBorder,
              }}
            >
              <Icon name={t.icon} size={30} color={on ? c.onAccent : c.accentInk} />
              <Text variant="caption" color={on ? c.onAccent : c.ink} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ gap: 20, paddingVertical: 24 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable
            accessibilityLabel="Less"
            onPress={() => setAmount((a) => Math.max(step, +(a - step).toFixed(2)))}
            style={{ width: 60, height: 60, borderRadius: radius.pill, backgroundColor: c.chipBg, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="minus" size={28} color={c.ink} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text variant="number" style={{ fontSize: typeScale.hero }}>
              {Number.isInteger(amount) ? amount.toLocaleString() : amount.toFixed(1)}
            </Text>
            <Text variant="body" color={c.muted}>{type.unit}</Text>
          </View>
          <Pressable
            accessibilityLabel="More"
            onPress={() => setAmount((a) => Math.min(type.max_per_entry, +(a + step).toFixed(2)))}
            style={{ width: 60, height: 60, borderRadius: radius.pill, backgroundColor: c.chipBg, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="plus" size={28} color={c.ink} />
          </Pressable>
        </Row>
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="small">Daily cap for {type.label.toLowerCase()}</Text>
            <Text variant="small">
              {earned} / {type.daily_cap} pts
            </Text>
          </Row>
          <ProgressBar value={earned} max={type.daily_cap} />
        </View>
      </Card>

      {isHealthType ? (
        <Chip
          tone="warm"
          icon="heart"
          label="Usually synced from Apple Health. Entering it by hand earns the same points."
        />
      ) : null}
      {earned >= type.daily_cap ? (
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
