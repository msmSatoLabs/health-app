/**
 * Small building blocks used by every screen. All styling comes from
 * src/theme/theme.ts so the look stays consistent.
 */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text as RNText,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activityColors, avatarColors, useTheme, withAlpha } from '../theme/theme';
import { Icon } from './Icon';

type TextVariant = 'largeTitle' | 'title' | 'section' | 'heading' | 'body' | 'label' | 'small' | 'caption' | 'number';

export function Text({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const { c, font, type } = useTheme();
  const v: Record<TextVariant, TextStyle> = {
    largeTitle: { fontFamily: font.heavy, fontSize: type.largeTitle, letterSpacing: -0.8, color: c.ink },
    title: { fontFamily: font.heavy, fontSize: type.title, letterSpacing: -0.5, color: c.ink },
    section: { fontFamily: font.heavy, fontSize: type.section, letterSpacing: -0.3, color: c.ink },
    heading: { fontFamily: font.bold, fontSize: type.heading, color: c.ink },
    body: { fontFamily: font.medium, fontSize: type.body, color: c.ink },
    label: { fontFamily: font.semibold, fontSize: type.label, letterSpacing: 0.6, textTransform: 'uppercase', color: c.muted },
    small: { fontFamily: font.medium, fontSize: type.small, color: c.muted },
    caption: { fontFamily: font.medium, fontSize: type.caption, color: c.muted },
    number: { fontFamily: font.heavy, fontSize: type.number, color: c.ink, fontVariant: ['tabular-nums'] },
  };
  return (
    <RNText numberOfLines={numberOfLines} style={[v[variant], color ? { color } : null, style]}>
      {children}
    </RNText>
  );
}

export function Screen({
  children,
  onRefresh,
  refreshing = false,
  scroll = true,
  topInset = true,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  /** Turn off on screens that already show a navigation header. */
  topInset?: boolean;
}) {
  const { c, space } = useTheme();
  const inner = { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 };
  return (
    <SafeAreaView edges={topInset ? ['top'] : []} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={inner}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c, radius } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: c.surface, borderRadius: radius.card, borderWidth: 1, borderColor: c.cardBorder, padding: 18 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  loading = false,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
}) {
  const { c, radius, font, type } = useTheme();
  const bg = kind === 'primary' ? c.accent : c.chipBg;
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.danger : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingVertical: 16,
        paddingHorizontal: 22,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={fg} /> : null}
          <RNText style={{ color: fg, fontFamily: font.bold, fontSize: type.body }}>{title}</RNText>
        </>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const { c, radius, font, type } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[
        {
          backgroundColor: c.chipBg,
          borderRadius: radius.input,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontFamily: font.medium,
          fontSize: type.body,
          color: c.ink,
        },
        props.style,
      ]}
    />
  );
}

export function Chip({ label, tone = 'accent', icon }: { label: string; tone?: 'accent' | 'warm' | 'muted'; icon?: string }) {
  const { c, radius, font, type } = useTheme();
  const bg = tone === 'accent' ? c.accentSoft : tone === 'warm' ? c.warmSoft : c.chipBg;
  const fg = tone === 'accent' ? c.accentInk : tone === 'warm' ? c.warmInk : c.muted;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      {icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <RNText style={{ color: fg, fontFamily: font.bold, fontSize: type.label, flexShrink: 1 }}>{label}</RNText>
    </View>
  );
}

/**
 * A rounded square with an icon. `tone` picks a theme color; `tint` uses an
 * activity's own color (see activityColors) on a soft background.
 */
export function IconBubble({
  name,
  tone = 'neutral',
  tint,
  size = 44,
}: {
  name: string;
  tone?: 'neutral' | 'accent' | 'warm' | 'activity';
  /** Overrides tone. Defaults to the activity color for `name` when tone is 'activity'. */
  tint?: string;
  size?: number;
}) {
  const { c, radius, isDark } = useTheme();
  const color = tint ?? (tone === 'activity' ? activityColors[name] : undefined);
  const bg = color
    ? withAlpha(color, isDark ? 0.22 : 0.14)
    : tone === 'accent'
      ? c.accentSoft
      : tone === 'warm'
        ? c.warmSoft
        : c.chipBg;
  const fg = color ?? (tone === 'accent' ? c.accentInk : tone === 'warm' ? c.warmInk : c.ink);
  return (
    <View style={{ width: size, height: size, borderRadius: radius.icon, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size * 0.53} color={fg} />
    </View>
  );
}

/** A small icon + number + label, used beside the ring on Home. */
export function MiniStat({
  icon,
  tone = 'accent',
  value,
  label,
}: {
  icon: string;
  tone?: 'accent' | 'warm';
  value: string;
  label: string;
}) {
  return (
    <Row style={{ gap: 10 }}>
      <IconBubble name={icon} tone={tone} size={38} />
      <View style={{ flexShrink: 1 }}>
        <Text variant="heading" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Row>
  );
}

/**
 * The one dark card on a screen (light in dark mode), so it stands out.
 * Optional progress bar underneath.
 */
export function FeatureCard({
  label,
  title,
  body,
  progress,
}: {
  label?: string;
  title: string;
  body?: string;
  progress?: { value: number; max: number };
}) {
  const { c, radius } = useTheme();
  const pct = progress && progress.max > 0 ? Math.min(1, progress.value / progress.max) : 0;
  return (
    <View style={{ backgroundColor: c.featureBg, borderRadius: radius.card, padding: 18, gap: 8 }}>
      {label ? (
        <Text variant="label" color={c.featureInk} style={{ opacity: 0.75 }}>
          {label}
        </Text>
      ) : null}
      <Text variant="heading" color={c.featureInk}>
        {title}
      </Text>
      {progress ? (
        <View style={{ height: 8, borderRadius: 99, backgroundColor: c.featureTrack, overflow: 'hidden' }}>
          <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 99, backgroundColor: c.featureFill }} />
        </View>
      ) : null}
      {body ? (
        <Text variant="small" color={c.featureInk} style={{ opacity: 0.8 }}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

/** A square activity choice: tinted round icon over a label. Accent-filled when selected. */
export function ActivityTile({
  icon,
  label,
  selected,
  onPress,
  width,
}: {
  icon: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  width: number;
}) {
  const { c, radius, isDark, font } = useTheme();
  const tint = activityColors[icon] ?? c.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        width,
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderRadius: radius.tile,
        backgroundColor: selected ? c.accent : c.surface,
        borderWidth: 1,
        borderColor: selected ? c.accent : c.cardBorder,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? withAlpha(c.onAccent, 0.2) : withAlpha(tint, isDark ? 0.22 : 0.14),
        }}
      >
        <Icon name={icon} size={23} color={selected ? c.onAccent : tint} />
      </View>
      <Text variant="caption" color={selected ? c.onAccent : c.ink} numberOfLines={1} style={{ fontFamily: font.semibold }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Round − and + buttons around a big number with its unit underneath. */
export function Stepper({
  value,
  unit,
  onLess,
  onMore,
  canLess = true,
  canMore = true,
}: {
  value: string;
  unit: string;
  onLess: () => void;
  onMore: () => void;
  canLess?: boolean;
  canMore?: boolean;
}) {
  const { c, radius, type } = useTheme();
  const button = (icon: string, label: string, onPress: () => void, enabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!enabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: radius.pill,
        backgroundColor: c.chipBg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: !enabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={26} color={c.ink} />
    </Pressable>
  );
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      {button('minus', 'Less', onLess, canLess)}
      <View style={{ alignItems: 'center', flex: 1 }} accessible accessibilityLabel={`${value} ${unit}`}>
        <Text variant="number" style={{ fontSize: type.hero }}>
          {value}
        </Text>
        <Text variant="small">{unit}</Text>
      </View>
      {button('plus', 'More', onMore, canMore)}
    </Row>
  );
}

/** A round profile photo, or the first letter of the name on a color when there's no photo. */
export function Avatar({
  name,
  url,
  size = 40,
  index,
  highlight = false,
}: {
  name: string;
  url?: string | null;
  size?: number;
  index?: number;
  highlight?: boolean;
}) {
  const { c, font } = useTheme();
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.chipBg }} />;
  }
  const i = index ?? [...name].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const bg = highlight ? c.accentSoft : avatarColors[i % avatarColors.length];
  const fg = highlight ? c.accentInk : c.onAvatar;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ color: fg, fontFamily: font.bold, fontSize: size * 0.4 }}>{(name[0] ?? '?').toUpperCase()}</RNText>
    </View>
  );
}

/** Centered profile photo with an accent ring, the name and a line under it. */
export function ProfileHeader({
  name,
  url,
  subtitle,
  size = 88,
}: {
  name: string;
  url?: string | null;
  subtitle?: string;
  size?: number;
}) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ borderRadius: 999, padding: 3, borderWidth: 2, borderColor: c.accent, marginBottom: 4 }}>
        <Avatar name={name} url={url} size={size} highlight />
      </View>
      <Text variant="title" numberOfLines={1} style={{ textAlign: 'center' }}>
        {name}
      </Text>
      {subtitle ? (
        <Text variant="small" style={{ textAlign: 'center' }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** A small card with a big centered number and a label. Use three in a Row. */
export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, gap: 2, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' }}>
      <Text variant="number" numberOfLines={1} style={{ fontSize: 24 }}>
        {value}
      </Text>
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

/**
 * An achievement badge: a tinted square with its icon (or a lock when not
 * earned), the title and one detail line.
 */
export function BadgeTile({
  icon,
  title,
  detail,
  earned,
  width,
  onPress,
  accessibilityLabel,
}: {
  icon: string;
  title: string;
  detail?: string;
  earned: boolean;
  width: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { c, radius, isDark } = useTheme();
  const tint = activityColors[icon] ?? c.accent;
  const body = (
    <View style={{ width, alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: radius.badge,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: earned ? withAlpha(tint, isDark ? 0.22 : 0.14) : c.chipBg,
          opacity: earned ? 1 : 0.6,
        }}
      >
        <Icon name={earned ? icon : 'lock'} size={Math.round(width * 0.34)} color={earned ? tint : c.muted} />
      </View>
      <Text variant="small" color={earned ? c.ink : c.muted} numberOfLines={1} style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {detail ? (
        <Text variant="caption" numberOfLines={1} style={{ textAlign: 'center', marginTop: -4 }}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={accessibilityLabel ?? title}>
      {body}
    </View>
  );
}

/** Overlapping avatars, e.g. the top members of a community. */
export function AvatarStack({
  people,
  size = 30,
}: {
  people: { id: string; name: string; url?: string | null }[];
  size?: number;
}) {
  const { c } = useTheme();
  return (
    <Row style={{ gap: 0 }}>
      {people.map((p, i) => (
        <View key={p.id} style={{ marginLeft: i ? -size / 3 : 0, borderWidth: 2, borderColor: c.surface, borderRadius: 99 }}>
          <Avatar name={p.name} url={p.url} size={size} />
        </View>
      ))}
    </Row>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { c, radius, font, type } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.chipBg, borderRadius: radius.pill, padding: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: on ? c.surface : 'transparent', alignItems: 'center' }}
          >
            <RNText style={{ fontFamily: font.semibold, fontSize: type.small, color: on ? c.ink : c.muted }}>{o.label}</RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>{children}</View>;
}

/** Apple-style section header: a bold title with an optional link on the right. */
export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
      <Text variant="section">{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text variant="body" color={c.accent}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </Row>
  );
}

/** A list row: icon or avatar on the left, title and subtitle, something on the right. */
export function ListRow({
  left,
  title,
  subtitle,
  right,
  onPress,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const body = (
    <Row style={{ paddingVertical: 4 }}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="heading" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Icon name="chevron" size={22} color={c.muted} /> : null}
    </Row>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

/** A settings row with an on/off switch. */
export function SwitchRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { c } = useTheme();
  return (
    <ListRow
      left={icon ? <IconBubble name={icon} size={36} /> : undefined}
      title={title}
      subtitle={subtitle}
      right={<Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.track }} accessibilityLabel={title} />}
    />
  );
}

/** A thin line between rows inside a card. */
export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line }} />;
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const { c } = useTheme();
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ height: 8, borderRadius: 99, backgroundColor: c.track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 99, backgroundColor: color ?? c.accent }} />
    </View>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  const { c } = useTheme();
  if (!message) return null;
  return (
    <Text variant="small" color={c.danger}>
      {message}
    </Text>
  );
}

export function Loading() {
  const { c } = useTheme();
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}

/** Width for a 4-across grid tile, so the last row lines up with the others. */
export function useGridTileWidth(columns = 4, gap = 8) {
  const { width } = useWindowDimensions();
  const { space } = useTheme();
  return Math.floor((Math.min(width, 600) - space.lg * 2 - gap * (columns - 1)) / columns);
}
