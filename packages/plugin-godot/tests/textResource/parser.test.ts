import { describe, expect, it } from 'vitest';

import {
  parseGodotProjectSettingsDocument,
  parseGodotTextResourceDocument,
} from '../../src/textResource/parser';

describe('parseGodotTextResourceDocument', () => {
  it('parses bracket tags with quoted and bare fields', () => {
    const document = parseGodotTextResourceDocument([
      '; [ext_resource path="res://ignored.png"]',
      '[gd_scene load_steps=3 format=3 uid="uid://scene"]',
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
        line: 3,
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

describe('parseGodotProjectSettingsDocument', () => {
  it('parses section-aware project settings while ignoring comments and blank lines', () => {
    const document = parseGodotProjectSettingsDocument([
      '; comment',
      '[application]',
      'config/name="Demo"',
      'run/main_scene="res://scenes/main.tscn"',
      '',
      '[autoload]',
      'GameManager="*res://scripts/game_manager.gd"',
    ].join('\n'));

    expect(document.settings).toEqual([
      {
        line: 3,
        section: 'application',
        key: 'config/name',
        value: '"Demo"',
      },
      {
        line: 4,
        section: 'application',
        key: 'run/main_scene',
        value: '"res://scenes/main.tscn"',
      },
      {
        line: 7,
        section: 'autoload',
        key: 'GameManager',
        value: '"*res://scripts/game_manager.gd"',
      },
    ]);
  });
});
