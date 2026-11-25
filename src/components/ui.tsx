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
import { avatarColors, useTheme } from '../theme/theme';
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

export function IconBubble({ name, tone = 'neutral', size = 44 }: { name: string; tone?: 'neutral' | 'accent' | 'warm'; size?: number }) {
  const { c, radius } = useTheme();
  const bg = tone === 'accent' ? c.accentSoft : tone === 'warm' ? c.warmSoft : c.chipBg;
  const fg = tone === 'accent' ? c.accentInk : tone === 'warm' ? c.warmInk : c.ink;
  return (
    <View style={{ width: size, height: size, borderRadius: radius.icon, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size * 0.53} color={fg} />
    </View>
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
