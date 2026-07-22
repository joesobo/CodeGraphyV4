import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR, getFileColor, normalizeHexColor } from '../src/fileColors';

describe('fileColors', () => {
  it('normalizes valid hex colors and falls back for invalid values', () => {
    expect(normalizeHexColor('  #aabbcc  ', '#111111')).toBe('#AABBCC');
    expect(normalizeHexColor(undefined, '#111111')).toBe('#111111');
    expect(normalizeHexColor('rgb(1, 2, 3)', '#111111')).toBe('#111111');
  });

  it('resolves known file extension colors case-insensitively', () => {
    expect(getFileColor('.TS')).not.toBe(DEFAULT_NODE_COLOR);
    expect(getFileColor('.unknown')).toBe(DEFAULT_NODE_COLOR);
  });
});
