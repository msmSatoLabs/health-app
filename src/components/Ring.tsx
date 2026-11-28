import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/theme';
import { Text } from './ui';

/** The daily progress ring (Apple Fitness style: thick stroke, big number in the middle). */
export function Ring({
  value,
  max,
  size = 220,
  stroke = 24,
  caption,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  caption?: string;
}) {
  const { c, type } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={`${value} of ${max} points today`}
    >
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - pct)}
        />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="number" style={{ fontSize: size >= 200 ? type.hero : size >= 140 ? type.largeTitle : type.number }}>
          {value}
        </Text>
        <Text variant="small">{caption ?? `of ${max} pts`}</Text>
      </View>
    </View>
  );
}
