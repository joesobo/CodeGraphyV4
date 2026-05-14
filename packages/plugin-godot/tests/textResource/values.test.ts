import { describe, expect, it } from 'vitest';
import { unquoteGodotValue } from '../../src/textResource/values';

describe('unquoteGodotValue', () => {
  it('removes matching single or double quotes', () => {
    expect(unquoteGodotValue('"res://scene.tscn"')).toBe('res://scene.tscn');
    expect(unquoteGodotValue("'res://scene.tscn'")).toBe('res://scene.tscn');
  });

  it('leaves unquoted or mismatched values unchanged', () => {
    expect(unquoteGodotValue('res://scene.tscn')).toBe('res://scene.tscn');
    expect(unquoteGodotValue('"res://scene.tscn')).toBe('"res://scene.tscn');
    expect(unquoteGodotValue('res://scene.tscn"')).toBe('res://scene.tscn"');
    expect(unquoteGodotValue("'res://scene.tscn")).toBe("'res://scene.tscn");
    expect(unquoteGodotValue("res://scene.tscn'")).toBe("res://scene.tscn'");
  });
});
