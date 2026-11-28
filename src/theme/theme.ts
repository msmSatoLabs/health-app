/**
 * The one place for colors, corner radii, spacing and fonts.
 * Based on the "Fresh" direction: calm, airy, one sage-green accent,
 * white cards with hairline borders and no shadows, 22px card corners.
 * Change values here and the whole app follows.
 */
import { useColorScheme } from 'react-native';
import { resolveIsDark, useThemePreference } from './appearance';

const light = {
  bg: '#F3F6F4',
  surface: '#FFFFFF',
  ink: '#16201B',
  muted: '#6E7C75',
  line: '#E3E9E5',
  cardBorder: '#E8EEEA',
  tabBg: '#FFFFFF',
  accent: '#2E9C73',
  onAccent: '#FFFFFF',
  accentSoft: '#DCF0E6',
  accentInk: '#1E6E50',
  warmSoft: '#FCEBDD',
  warmInk: '#B4602A',
  chipBg: '#EDF1EE',
  track: '#E4EBE7',
  // The one dark element (quests / highlights) so it stands out.
  featureBg: '#16201B',
  featureInk: '#F3F6F4',
  featureTrack: 'rgba(255,255,255,0.15)',
  featureFill: '#7AD9AE',
  good: '#2E9C73',
  gold: '#E9B949',
  danger: '#C2473A',
  onAvatar: '#FFFFFF',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#0F1412',
  surface: '#182019',
  ink: '#E7EEE9',
  muted: '#8C9C94',
  line: '#222C26',
  cardBorder: '#212B25',
  tabBg: '#131916',
  accent: '#4CC596',
  onAccent: '#0D1A14',
  accentSoft: '#1D3A2D',
  accentInk: '#8BE3BC',
  warmSoft: '#3A2A1D',
  warmInk: '#F1A36B',
  chipBg: '#1F2823',
  track: '#232D27',
  featureBg: '#DCF0E6',
  featureInk: '#10251B',
  featureTrack: 'rgba(16,37,27,0.15)',
  featureFill: '#2E9C73',
  good: '#4CC596',
  gold: '#E9B949',
  danger: '#E5776A',
  onAvatar: '#FFFFFF',
};

export const radius = {
  card: 22,
  tile: 18,
  row: 16,
  icon: 12,
  badge: 18,
  input: 14,
  pill: 999,
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/**
 * Type scale, sized like Apple's Health and Fitness apps: large titles,
 * 17pt body text, bold section headers.
 */
export const type = {
  largeTitle: 34,
  title: 28,
  section: 22,
  heading: 19,
  body: 17,
  small: 15,
  label: 13,
  caption: 12,
  number: 28,
  hero: 44,
  tab: 11,
};

/** Manrope weights, loaded in src/app/_layout.tsx. */
export const font = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
};

/** Colors used for member avatars. */
export const avatarColors = ['#E07A5F', '#3D9970', '#6C5CE7', '#F2A541', '#2D9CDB', '#D35D9B', '#5A6B7B'];

/**
 * One color per kind of activity, used to tint its icon tile (Fresh mockups).
 * Keyed by the icon name stored in activity_types.icon. Tiles show the color
 * at low opacity behind a full-strength glyph, so they work in light and dark.
 */
export const activityColors: Record<string, string> = {
  walk: '#3D9970',
  gym: '#6C5CE7',
  moon: '#6F86A6',
  flame: '#E07A5F',
  drop: '#2D9CDB',
  bowl: '#F2A541',
  book: '#D35D9B',
  users: '#17A2A2',
};

/** Hex color at a given opacity, e.g. withAlpha('#3D9970', 0.13) for a soft tile. */
export function withAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
}

export const palettes = { light, dark };

/** Colors follow the choice in Settings → Appearance (System, Light or Dark). */
export function useTheme() {
  const scheme = useColorScheme();
  const preference = useThemePreference();
  const isDark = resolveIsDark(preference, scheme);
  return { c: isDark ? dark : light, isDark, radius, space, font, type };
}

export type Theme = ReturnType<typeof useTheme>;
