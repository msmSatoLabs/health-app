import { View } from 'react-native';
import { useTheme } from '../theme/theme';
import { Text } from './ui';

export type Bar = { key: string; label: string; value: number; highlight?: boolean };

/**
 * Simple vertical bars (like Apple Health's charts). Bars that reach
 * `goal` are drawn in the accent color; a dashed line marks the goal.
 * Only every `labelEvery`-th label is shown so long ranges stay readable.
 */
export function BarChart({
  bars,
  goal,
  height = 140,
  labelEvery = 1,
}: {
  bars: Bar[];
  goal?: number;
  height?: number;
  labelEvery?: number;
}) {
  const { c, type } = useTheme();
  const max = Math.max(1, goal ?? 0, ...bars.map((b) => b.value));
  const gap = bars.length > 20 ? 2 : 6;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {goal ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: (goal / max) * height,
              borderTopWidth: 1,
              borderStyle: 'dashed',
              borderColor: c.muted,
              opacity: 0.5,
            }}
          />
        ) : null}
        {bars.map((b) => {
          const hit = goal ? b.value >= goal : b.highlight;
          return (
            <View
              key={b.key}
              style={{
                flex: 1,
                height: Math.max(3, (b.value / max) * height),
                borderRadius: bars.length > 20 ? 2 : 6,
                backgroundColor: b.value === 0 ? c.track : hit ? c.accent : c.accentSoft,
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap }}>
        {bars.map((b, i) => (
          <Text
            key={b.key}
            variant="caption"
            numberOfLines={1}
            style={{ flex: 1, textAlign: 'center', fontSize: type.caption, overflow: 'visible' }}
          >
            {i % labelEvery === 0 ? b.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}
