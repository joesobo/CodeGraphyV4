import { describe, expect, it } from 'vitest';
import { extractClassNameSymbols } from '../../../src/plugin/symbol/className';

describe('extractClassNameSymbols', () => {
  it('extracts class_name symbols with Godot-specific provenance', () => {
    const symbols = extractClassNameSymbols([
      '# class_name IgnoredComment',
      'class_name Player # inline comments are not part of the symbol',
    ].join('\n'), '/workspace/game/scripts/player.gd', 'scripts/player.gd');

    expect(symbols).toEqual([
      {
        id: 'scripts/player.gd#Player:godot-class-name',
        name: 'Player',
        kind: 'class',
        filePath: '/workspace/game/scripts/player.gd',
        signature: 'class_name Player',
        range: {
          startLine: 2,
          startColumn: 1,
          endLine: 2,
          endColumn: 18,
        },
        metadata: {
          language: 'gdscript',
          source: 'codegraphy.gdscript',
          pluginKind: 'godot-class-name',
        },
      },
    ]);
  });
});
