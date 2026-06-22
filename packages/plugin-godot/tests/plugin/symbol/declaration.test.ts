import { describe, expect, it } from 'vitest';
import { extractDeclarationSymbols } from '../../../src/plugin/symbol/declaration';

describe('extractDeclarationSymbols', () => {
  it('extracts declaration symbols with exact ranges and metadata', () => {
    const symbols = extractDeclarationSymbols([
      '@export var speed := 10 # pixels per second',
      '  const TEAM = "blue"',
      '\tenum State { IDLE, RUN }',
      'static func spawn() -> Player:',
      'func run():',
      'print("var fake")',
      'if ready: func hidden():',
    ].join('\n'), '/workspace/game/scripts/player.gd', 'scripts/player.gd');

    expect(symbols).toEqual([
      {
        id: 'scripts/player.gd#speed:variable',
        name: 'speed',
        kind: 'variable',
        filePath: '/workspace/game/scripts/player.gd',
        signature: 'var speed := 10',
        range: {
          startLine: 1,
          startColumn: 9,
          endLine: 1,
          endColumn: 24,
        },
        metadata: {
          language: 'gdscript',
          pluginKind: 'exported-property',
          source: 'codegraphy.gdscript',
        },
      },
      {
        id: 'scripts/player.gd#TEAM:constant',
        name: 'TEAM',
        kind: 'constant',
        filePath: '/workspace/game/scripts/player.gd',
        signature: 'const TEAM = "blue"',
        range: {
          startLine: 2,
          startColumn: 3,
          endLine: 2,
          endColumn: 22,
        },
        metadata: {
          language: 'gdscript',
          source: 'codegraphy.gdscript',
        },
      },
      {
        id: 'scripts/player.gd#State:enum',
        name: 'State',
        kind: 'enum',
        filePath: '/workspace/game/scripts/player.gd',
        signature: 'enum State { IDLE, RUN }',
        range: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 26,
        },
        metadata: {
          language: 'gdscript',
          source: 'codegraphy.gdscript',
        },
      },
      {
        id: 'scripts/player.gd#spawn:function',
        name: 'spawn',
        kind: 'function',
        filePath: '/workspace/game/scripts/player.gd',
        signature: 'static func spawn() -> Player:',
        range: {
          startLine: 4,
          startColumn: 1,
          endLine: 4,
          endColumn: 31,
        },
        metadata: {
          language: 'gdscript',
          source: 'codegraphy.gdscript',
        },
      },
      {
        id: 'scripts/player.gd#run:function',
        name: 'run',
        kind: 'function',
        filePath: '/workspace/game/scripts/player.gd',
        signature: 'func run():',
        range: {
          startLine: 5,
          startColumn: 1,
          endLine: 5,
          endColumn: 12,
        },
        metadata: {
          language: 'gdscript',
          source: 'codegraphy.gdscript',
        },
      },
    ]);
  });

  it('treats a variable after a standalone export annotation as an exported property', () => {
    const symbols = extractDeclarationSymbols([
      '@export_range(0.0, 600.0)',
      'var speed: float = 300.0',
    ].join('\n'), '/workspace/game/scripts/player.gd', 'scripts/player.gd');

    expect(symbols).toEqual([
      expect.objectContaining({
        id: 'scripts/player.gd#speed:variable',
        kind: 'variable',
        name: 'speed',
        metadata: {
          language: 'gdscript',
          pluginKind: 'exported-property',
          source: 'codegraphy.gdscript',
        },
      }),
    ]);
  });
});
