/** Podium and rows for community leaderboards (Fresh mockups). */
import { Pressable, View } from 'react-native';
import { useTheme, withAlpha } from '../theme/theme';
import { Avatar, Text } from './ui';

export type BoardPerson = { user_id: string; display_name: string; avatar_url: string | null; points: number; rank: number };

/** Top three: 2nd, 1st, 3rd from left to right, with blocks of different heights. */
export function Podium({
  people,
  userId,
  onPress,
}: {
  people: BoardPerson[];
  userId: string;
  onPress: (p: BoardPerson) => void;
}) {
  const { c, radius } = useTheme();
  const order = [people[1], people[0], people[2]].filter(Boolean) as BoardPerson[];
  const heights = [72, 100, 56];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
      {order.map((p, i) => {
        const first = i === 1;
        const me = p.user_id === userId;
        const size = first ? 64 : 52;
        return (
          <Pressable
            key={p.user_id}
            onPress={() => onPress(p)}
            accessibilityRole="button"
            accessibilityLabel={`Rank ${p.rank}, ${me ? 'you' : p.display_name}, ${p.points} points`}
            style={({ pressed }) => ({ flex: first ? 1.15 : 1, alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}
          >
            <View
              style={{
                borderRadius: 99,
                padding: 3,
                borderWidth: 2,
                borderColor: first ? c.gold : me ? c.accent : 'transparent',
              }}
            >
              <Avatar name={p.display_name} url={p.avatar_url} size={size} />
            </View>
            <Text variant="small" color={c.ink} numberOfLines={1} style={{ maxWidth: '100%' }}>
              {me ? 'You' : p.display_name}
            </Text>
            <View
              style={{
                alignSelf: 'stretch',
                height: heights[i],
                borderTopLeftRadius: radius.tile,
                borderTopRightRadius: radius.tile,
                borderBottomLeftRadius: 6,
                borderBottomRightRadius: 6,
                backgroundColor: me ? c.accent : c.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="section" color={me ? c.onAccent : c.accentInk}>
                {p.rank}
              </Text>
            </View>
            <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
              {p.points.toLocaleString()} pts
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** One leaderboard row. Your own row is filled with the accent color. */
export function LeaderRow({
  person,
  me,
  subtitle,
  onPress,
}: {
  person: BoardPerson;
  me: boolean;
  subtitle?: string;
  onPress: () => void;
}) {
  const { c, radius } = useTheme();
  const fg = me ? c.onAccent : c.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${person.rank}, ${me ? 'you' : person.display_name}, ${person.points} points`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: radius.row,
        backgroundColor: me ? c.accent : c.surface,
        borderWidth: 1,
        borderColor: me ? c.accent : c.cardBorder,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text variant="heading" color={me ? withAlpha(c.onAccent, 0.8) : c.muted} style={{ width: 28, fontVariant: ['tabular-nums'] }}>
        {person.rank}
      </Text>
      <Avatar name={person.display_name} url={person.avatar_url} size={40} />
      <View style={{ flex: 1 }}>
        <Text variant="heading" color={fg} numberOfLines={1}>
          {me ? 'You' : person.display_name}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={me ? withAlpha(c.onAccent, 0.8) : c.muted} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text variant="heading" color={fg} style={{ fontVariant: ['tabular-nums'] }}>
        {person.points.toLocaleString()}
      </Text>
    </Pressable>
  );
}
