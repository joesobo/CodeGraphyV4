import { describe, expect, it } from 'vitest';
import { adjustColorForLightTheme } from '../../../src/webview/colorParsing/adjust';

describe('webview/colorParsing/adjust', () => {
  it('darkens each channel by the light theme factor', () => {
    expect(adjustColorForLightTheme('#ff8040')).toBe('#b35a2d');
  });

  it('returns the original value when parsing fails', () => {
    expect(adjustColorForLightTheme('not-a-color')).toBe('not-a-color');
  });

  it('preserves transparent color values', () => {
    expect(adjustColorForLightTheme(' transparent ')).toBe(' transparent ');
    expect(adjustColorForLightTheme('rgba(0, 0, 0, 0.0)')).toBe('rgba(0, 0, 0, 0.0)');
  });
});
