import { describe, expect, it } from 'vitest';
import { isIgnoredGodotLine, trimGodotTextLine } from '../../src/textResource/lines';

describe('Godot text resource line helpers', () => {
  it('trims surrounding whitespace', () => {
    expect(trimGodotTextLine('  [gd_scene]  ')).toBe('[gd_scene]');
  });

  it('ignores blank and semicolon comment lines', () => {
    expect(isIgnoredGodotLine('')).toBe(true);
    expect(isIgnoredGodotLine('; comment')).toBe(true);
    expect(isIgnoredGodotLine('[gd_scene]')).toBe(false);
    expect(isIgnoredGodotLine('key=value ; not a line comment')).toBe(false);
  });
});
