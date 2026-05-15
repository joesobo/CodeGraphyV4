import { describe, expect, it } from 'vitest';

import {
  parseGodotResourceAst,
  readGodotResourceUid,
} from '../../src/textResource/resourceAst';

describe('parseGodotResourceAst', () => {
  it('uses the Godot resource parser package for scene external resources', () => {
    const ast = parseGodotResourceAst([
      '[gd_scene load_steps=3 format=3 uid="uid://scene"]',
      '[ext_resource type="Script" uid="uid://player" path="res://scripts/player.gd" id="1_player"]',
      '[node name="Player" type="Node2D"]',
      'position = Vector2(10, 20)',
    ].join('\n'));

    expect(ast).toEqual({
      uid: 'uid://scene',
      extResources: [
        {
          path: 'res://scripts/player.gd',
          uid: 'uid://player',
        },
      ],
    });
  });

  it('returns null when the package parser cannot parse a Godot text resource', () => {
    expect(parseGodotResourceAst('[gd_scene format=3]\n[ext_resource path=\'res://legacy.gd\']')).toBeNull();
  });
});

describe('readGodotResourceUid', () => {
  it('reads resource header UIDs from parsed resources', () => {
    expect(readGodotResourceUid([
      '[gd_resource type="Resource" format=3 uid="uid://inventory-item"]',
      '[resource]',
      'display_name = "Inventory Item"',
    ].join('\n'))).toBe('uid://inventory-item');
  });

  it('returns null when the package parser cannot parse the resource', () => {
    expect(readGodotResourceUid('[gd_resource format=3 uid=\'uid://legacy-resource\']')).toBeNull();
  });
});
