import { describe, it, expect } from 'vitest';
import {
  normalizeHexColor,
  DEFAULT_NODE_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_DIRECTION_COLOR,
  FILE_TYPE_COLORS,
  getFileColor,
} from '../../src/shared/fileColors';

describe('normalizeHexColor', () => {
  it('returns the default color when value is undefined', () => {
    expect(normalizeHexColor(undefined, '#FF0000')).toBe('#FF0000');
  });

  it('returns the default color when value is an empty string', () => {
    expect(normalizeHexColor('', '#FF0000')).toBe('#FF0000');
  });

  it('normalizes a valid lowercase hex color to uppercase', () => {
    expect(normalizeHexColor('#aabbcc', '#000000')).toBe('#AABBCC');
  });

  it('normalizes a valid uppercase hex color', () => {
    expect(normalizeHexColor('#AABBCC', '#000000')).toBe('#AABBCC');
  });

  it('normalizes a valid mixed-case hex color', () => {
    expect(normalizeHexColor('#aAbBcC', '#000000')).toBe('#AABBCC');
  });

  it('returns the default for hex colors with too few digits', () => {
    expect(normalizeHexColor('#abc', '#FF0000')).toBe('#FF0000');
  });

  it('returns the default for hex colors with too many digits', () => {
    expect(normalizeHexColor('#aabbccdd', '#FF0000')).toBe('#FF0000');
  });

  it('returns the default for hex colors without hash prefix', () => {
    expect(normalizeHexColor('aabbcc', '#FF0000')).toBe('#FF0000');
  });

  it('returns the default for non-hex characters', () => {
    expect(normalizeHexColor('#gghhii', '#FF0000')).toBe('#FF0000');
  });

  it('trims whitespace before validation', () => {
    expect(normalizeHexColor('  #aabbcc  ', '#FF0000')).toBe('#AABBCC');
  });

  it('returns the default for whitespace-only input', () => {
    expect(normalizeHexColor('   ', '#FF0000')).toBe('#FF0000');
  });

  it('handles all valid hex digit values', () => {
    expect(normalizeHexColor('#012345', '#000000')).toBe('#012345');
    expect(normalizeHexColor('#6789ab', '#000000')).toBe('#6789AB');
    expect(normalizeHexColor('#cdef00', '#000000')).toBe('#CDEF00');
  });

  it('rejects strings that only contain a valid hex substring', () => {
    expect(normalizeHexColor('prefix #AABBCC', '#FF0000')).toBe('#FF0000');
    expect(normalizeHexColor('#AABBCC suffix', '#FF0000')).toBe('#FF0000');
    expect(normalizeHexColor('#AABBCC#', '#FF0000')).toBe('#FF0000');
  });
});

describe('file color defaults', () => {
  it('keeps the expected default colors', () => {
    expect(DEFAULT_NODE_COLOR).toBe('#A1A1AA');
    expect(DEFAULT_FOLDER_NODE_COLOR).toBe('#A1A1AA');
    expect(DEFAULT_DIRECTION_COLOR).toBe('#475569');
  });

  it('uses the exact supported extension palette', () => {
    expect(FILE_TYPE_COLORS).toEqual({
      '.ts': '#93C5FD',
      '.tsx': '#67E8F9',
      '.js': '#FDE68A',
      '.jsx': '#FDBA74',
      '.css': '#F9A8D4',
      '.scss': '#E879F9',
      '.json': '#86EFAC',
      '.md': '#CBD5E1',
      '.html': '#FCA5A5',
      '.svg': '#C4B5FD',
    });
  });
});

describe('getFileColor', () => {
  it('returns the correct color for each known file extension', () => {
    const expected: Record<string, string> = {
      '.ts': '#93C5FD',
      '.tsx': '#67E8F9',
      '.js': '#FDE68A',
      '.jsx': '#FDBA74',
      '.css': '#F9A8D4',
      '.scss': '#E879F9',
      '.json': '#86EFAC',
      '.md': '#CBD5E1',
      '.html': '#FCA5A5',
      '.svg': '#C4B5FD',
    };

    for (const [extension, color] of Object.entries(expected)) {
      expect(getFileColor(extension)).toBe(color);
    }
  });

  it('performs case-insensitive lookup', () => {
    expect(getFileColor('.TS')).toBe(FILE_TYPE_COLORS['.ts']);
    expect(getFileColor('.Json')).toBe(FILE_TYPE_COLORS['.json']);
  });

  it('returns DEFAULT_NODE_COLOR for unknown extensions', () => {
    expect(getFileColor('.unknown')).toBe(DEFAULT_NODE_COLOR);
    expect(getFileColor('.py')).toBe(DEFAULT_NODE_COLOR);
    expect(getFileColor('')).toBe(DEFAULT_NODE_COLOR);
  });
});
