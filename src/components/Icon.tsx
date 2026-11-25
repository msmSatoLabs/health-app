import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

type GlyphName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * App icon names -> icon set glyphs. The database stores the short names
 * (e.g. activity_types.icon = 'walk'), so new icons only need a line here.
 */
const glyphs = {
  walk: 'walk',
  gym: 'dumbbell',
  moon: 'weather-night',
  flame: 'fire',
  drop: 'water-outline',
  bowl: 'food-apple-outline',
  book: 'book-open-variant',
  users: 'account-group-outline',
  star: 'star-outline',
  trophy: 'trophy-outline',
  target: 'bullseye-arrow',
  mountain: 'terrain',
  home: 'home-outline',
  plus: 'plus',
  minus: 'minus',
  user: 'account-outline',
  lock: 'lock-outline',
  share: 'share-variant-outline',
  copy: 'content-copy',
  bolt: 'lightning-bolt-outline',
  heart: 'heart-pulse',
  sync: 'sync',
  close: 'close',
  chevron: 'chevron-right',
  logout: 'logout',
  trash: 'trash-can-outline',
  pencil: 'pencil-outline',
  link: 'link-variant',
  settings: 'cog-outline',
  trendUp: 'trending-up',
  trendDown: 'trending-down',
  trendFlat: 'trending-neutral',
  camera: 'camera-outline',
  live: 'access-point',
} satisfies Record<string, GlyphName>;

export type IconName = keyof typeof glyphs;

export function Icon({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  const glyph: GlyphName = (glyphs as Record<string, GlyphName>)[name] ?? 'circle-outline';
  return <MaterialCommunityIcons name={glyph} size={size} color={color} />;
}
