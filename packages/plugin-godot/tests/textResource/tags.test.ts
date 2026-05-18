import { describe, expect, it } from 'vitest';
import { parseGodotTextResourceTag } from '../../src/textResource/tags';

describe('parseGodotTextResourceTag', () => {
  it('parses a text resource bracket tag', () => {
    expect(parseGodotTextResourceTag('[ext_resource type="Script" path="res://player.gd"]', 5))
      .toEqual({
        line: 5,
        name: 'ext_resource',
        fields: {
          type: 'Script',
          path: 'res://player.gd',
        },
      });
  });

  it('rejects malformed or non-leading tags', () => {
    expect(parseGodotTextResourceTag('prefix [ext_resource path="res://player.gd"]', 1)).toBeNull();
    expect(parseGodotTextResourceTag('[3bad path="res://player.gd"]', 1)).toBeNull();
    expect(parseGodotTextResourceTag('[ext_resource path="res://player.gd"', 1)).toBeNull();
  });
});
