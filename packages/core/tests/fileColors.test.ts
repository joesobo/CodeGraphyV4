import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR, getFileColor, normalizeHexColor } from '../src/fileColors';

describe('fileColors', () => {
  it('normalizes valid hex colors and falls back for invalid values', () => {
    expect(normalizeHexColor('  #aabbcc  ', '#111111')).toBe('#AABBCC');
    expect(normalizeHexColor(undefined, '#111111')).toBe('#111111');
    expect(normalizeHexColor('rgb(1, 2, 3)', '#111111')).toBe('#111111');
    expect(normalizeHexColor('prefix#AABBCC', '#111111')).toBe('#111111');
    expect(normalizeHexColor('#AABBCCsuffix', '#111111')).toBe('#111111');
  });

  it('resolves file extension colors case-insensitively', () => {
    expect(getFileColor('.TS')).toBe('#93C5FD');
    expect(getFileColor('.PY')).toBe(getFileColor('.py'));
    expect(getFileColor('.py')).toBe('#C4B5FD');
    expect(getFileColor('.rb')).toBe('#FCA5A5');
    expect(getFileColor('')).toBe(DEFAULT_NODE_COLOR);
  });
});
