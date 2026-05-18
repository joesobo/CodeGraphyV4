import { describe, expect, it } from 'vitest';
import { readQuotedStringLiteral } from '../../src/gdscript/stringLiteral';

describe('readQuotedStringLiteral', () => {
  it('reads matching single and double quoted values', () => {
    expect(readQuotedStringLiteral('"res://scene.tscn"')).toBe('res://scene.tscn');
    expect(readQuotedStringLiteral("'res://scene.tscn'")).toBe('res://scene.tscn');
  });

  it('rejects missing and mismatched quoted values', () => {
    expect(readQuotedStringLiteral(null)).toBeNull();
    expect(readQuotedStringLiteral('res://scene.tscn')).toBeNull();
    expect(readQuotedStringLiteral('abcda')).toBeNull();
    expect(readQuotedStringLiteral('"res://scene.tscn\'')).toBeNull();
  });

  it('rejects parser-recovered values that include newlines or the active quote', () => {
    expect(readQuotedStringLiteral('"res://scene.tscn"\n"res://other.tscn"')).toBeNull();
    expect(readQuotedStringLiteral('"res://scene.tscn"suffix"')).toBeNull();
    expect(readQuotedStringLiteral("'res://scene.tscn'suffix'")).toBeNull();
  });
});
