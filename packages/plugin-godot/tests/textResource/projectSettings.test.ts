import { describe, expect, it } from 'vitest';
import { parseGodotProjectSettingsDocument } from '../../src/textResource/projectSettings';

describe('parseGodotProjectSettingsDocument', () => {
  it('parses section-aware project settings while ignoring comments and blank lines', () => {
    const document = parseGodotProjectSettingsDocument([
      ' ; ignored/key="bad"',
      '[application]',
      'config/name="Demo"',
      '=missing_key',
      'run/main_scene="res://scenes/main.tscn"',
      'missing_value=',
      'missing separator',
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
        line: 5,
        section: 'application',
        key: 'run/main_scene',
        value: '"res://scenes/main.tscn"',
      },
      {
        line: 10,
        section: 'autoload',
        key: 'GameManager',
        value: '"*res://scripts/game_manager.gd"',
      },
    ]);
  });
});
