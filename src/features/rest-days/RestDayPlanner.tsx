import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Card, Divider, ErrorNote, IconBubble, Loading, Row, Text } from '../../components/ui';
import { cancelRestDay, friendlyError, getMyRestDays, getMyStats, planRestDay } from '../../lib/api';
import { addDays, localDay, prettyDay, shortWeekday } from '../../lib/dates';
import { useLoad } from '../../lib/useLoad';
import { useTheme } from '../../theme/theme';
import { canPlanRestDay, isBeforeDeadline, nextPlannableWeek, restDayReasonText, restDayToMove, weekDays } from './logic';

/** How many upcoming weeks to show (next week and the one after). */
const WEEKS_SHOWN = 2;

/** Plan rest days for upcoming weeks. The database re-checks every rule. */
export function RestDayPlanner() {
  const { c } = useTheme();
  const { data, error, reload } = useLoad(async () => {
    const [restDays, stats] = await Promise.all([getMyRestDays(), getMyStats()]);
    return { planned: restDays.map((r) => r.day), perWeek: stats.rest_days_per_week ?? 1 };
  });
  const [busyDay, setBusyDay] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!data) return error ? <ErrorNote message={error} /> : <Loading />;

  const today = localDay();
  const { planned, perWeek } = data;
  const thisWeek = weekDays(today).filter((d) => planned.includes(d));
  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, i) =>
    nextPlannableWeek(today).map((d) => addDays(d, 7 * i)),
  );

  async function run(day: string, action: (d: string) => Promise<void>) {
    setBusyDay(day);
    setActionError(null);
    try {
      await action(day);
      await reload();
    } catch (e) {
      setActionError(friendlyError(e));
    } finally {
      setBusyDay(null);
    }
  }

  function onTapDay(day: string) {
    if (planned.includes(day)) {
      if (!isBeforeDeadline(day, today)) return;
      Alert.alert('Cancel rest day?', prettyDay(day, today), [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel rest day', style: 'destructive', onPress: () => run(day, cancelRestDay) },
      ]);
      return;
    }
    const from = restDayToMove(day, today, planned, perWeek);
    if (from) {
      run(day, async (to) => {
        await cancelRestDay(from);
        try {
          await planRestDay(to);
        } catch (e) {
          // Put the old day back so a failed move never loses the rest day.
          await planRestDay(from).catch(() => {});
          throw e;
        }
      });
      return;
    }
    const check = canPlanRestDay(day, today, planned, perWeek);
    if (!check.ok) {
      setActionError(restDayReasonText(check.reason));
      return;
    }
    run(day, planRestDay);
  }

  return (
    <View style={{ gap: 10 }}>
      <Text variant="small">
        {perWeek === 1
          ? 'One rest day per week (Monday to Sunday) keeps your streak alive. Plan it before the week starts, by Sunday night.'
          : `${perWeek} rest days per week (Monday to Sunday) keep your streak alive. Plan them before the week starts, by Sunday night.`}
      </Text>
      <Card style={{ gap: 14 }}>
        <Row>
          <IconBubble name="moon" tone="activity" size={36} />
          <View style={{ flex: 1 }}>
            <Text variant="label">This week</Text>
            <Text variant="body" numberOfLines={1}>
              {thisWeek.length ? thisWeek.map((d) => prettyDay(d, today)).join(', ') : 'No rest day planned'}
            </Text>
          </View>
        </Row>
        {weeks.map((days, i) => {
          const full = days.filter((d) => planned.includes(d)).length >= perWeek;
          return (
            <View key={days[0]} style={{ gap: 10 }}>
              <Divider />
              <Text variant="label">{i === 0 ? 'Next week' : `Week of ${prettyDay(days[0], today)}`}</Text>
              <Row style={{ gap: 6 }}>
                {days.map((d) => (
                  <DayPill
                    key={d}
                    day={d}
                    on={planned.includes(d)}
                    dimmed={full && perWeek > 1 && !planned.includes(d)}
                    busy={busyDay === d}
                    onPress={() => onTapDay(d)}
                  />
                ))}
              </Row>
            </View>
          );
        })}
      </Card>
      <ErrorNote message={actionError} />
      <Text variant="caption" color={c.muted}>
        {(perWeek === 1
          ? 'Tap a day to plan it, tap another day to move it, or tap it again to cancel.'
          : 'Tap a day to plan it, tap it again to cancel.') +
          " A rest day doesn't add to your streak, it just doesn't break it."}
      </Text>
    </View>
  );
}

function DayPill({
  day,
  on,
  dimmed,
  busy,
  onPress,
}: {
  day: string;
  on: boolean;
  dimmed: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const { c, radius } = useTheme();
  const date = Number(day.slice(8, 10));
  const fg = on ? c.onAccent : dimmed ? c.muted : c.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled: busy }}
      accessibilityLabel={`${prettyDay(day)}${on ? ', rest day' : ''}`}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 2,
        paddingVertical: 10,
        minHeight: 52,
        justifyContent: 'center',
        borderRadius: radius.pill,
        backgroundColor: on ? c.accent : c.chipBg,
        opacity: busy ? 0.5 : dimmed ? 0.6 : 1,
      }}
    >
      <Text variant="caption" color={fg}>
        {shortWeekday(day)}
      </Text>
      <Text variant="label" color={fg}>
        {String(date)}
      </Text>
    </Pressable>
  );
}
