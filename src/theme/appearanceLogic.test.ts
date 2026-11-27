import { describe, expect, it } from '@jest/globals';
import { parseThemePreference, resolveIsDark } from './appearanceLogic';

describe('resolveIsDark', () => {
  it('follows the phone when set to system', () => {
    expect(resolveIsDark('system', 'dark')).toBe(true);
    expect(resolveIsDark('system', 'light')).toBe(false);
    expect(resolveIsDark('system', null)).toBe(false);
  });

  it('ignores the phone when light or dark is chosen', () => {
    expect(resolveIsDark('light', 'dark')).toBe(false);
    expect(resolveIsDark('dark', 'light')).toBe(true);
  });
});

describe('parseThemePreference', () => {
  it('reads saved values and falls back to system', () => {
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference(null)).toBe('system');
    expect(parseThemePreference('purple')).toBe('system');
  });
});
