import { describe, expect, it } from 'vitest';
import { parseGodotTextResourceDocument } from '../../src/textResource/document';

describe('parseGodotTextResourceDocument', () => {
  it('parses bracket tags with quoted and bare fields', () => {
    const document = parseGodotTextResourceDocument([
      '   ; [ext_resource path="res://ignored.png"]',
      '   [gd_scene load_steps=3 format=3 uid="uid://scene"]',
      'not a tag',
      '[ext_resource type="Script" uid="uid://script" path="../../scripts/player.gd" id="1_script"]',
    ].join('\n'));

    expect(document.tags).toEqual([
      {
        line: 2,
        name: 'gd_scene',
        fields: {
          load_steps: '3',
          format: '3',
          uid: 'uid://scene',
        },
      },
      {
        line: 4,
        name: 'ext_resource',
        fields: {
          type: 'Script',
          uid: 'uid://script',
          path: '../../scripts/player.gd',
          id: '1_script',
        },
      },
    ]);
  });
});
