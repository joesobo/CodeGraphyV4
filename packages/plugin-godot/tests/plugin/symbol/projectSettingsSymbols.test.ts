import { describe, expect, it } from 'vitest';
import { extractProjectSettingsSymbols } from '../../../src/plugin/symbol/projectSettingsSymbols';

describe('extractProjectSettingsSymbols', () => {
  it('extracts autoload symbols from project settings', () => {
    const symbols = extractProjectSettingsSymbols([
      '[application]',
      'config/name="Demo"',
      '',
      '[autoload]',
      'GameManager="*res://scripts/game_manager.gd"',
    ].join('\n'), '/workspace/game/project.godot', 'project.godot');

    expect(symbols).toEqual([
      {
        id: 'project.godot#GameManager:autoload',
        name: 'GameManager',
        kind: 'autoload',
        filePath: '/workspace/game/project.godot',
        signature: 'GameManager="*res://scripts/game_manager.gd"',
        range: {
          startLine: 5,
          startColumn: 1,
          endLine: 5,
          endColumn: 12,
        },
        metadata: {
          language: 'godot-project-settings',
          pluginKind: 'autoload',
          source: 'codegraphy.gdscript',
        },
      },
    ]);
  });

  it('ignores non-project settings files', () => {
    expect(extractProjectSettingsSymbols(
      '[autoload]\nGameManager="*res://scripts/game_manager.gd"',
      '/workspace/game/scripts/project.gd',
      'scripts/project.gd',
    )).toEqual([]);
  });
});
