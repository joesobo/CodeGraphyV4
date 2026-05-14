import { describe, expect, it } from 'vitest';
import { extractSymbols } from '../../src/plugin/symbol';

describe('extractSymbols', () => {
  it('combines class_name and declaration symbols in source order', () => {
    const symbols = extractSymbols([
      'class_name Player',
      '@export var speed := 10 # pixels per second',
      'const TEAM = "blue"',
      'enum State { IDLE, RUN }',
      'static func spawn() -> Player:',
    ].join('\n'), '/workspace/game/scripts/player.gd', 'scripts/player.gd');

    expect(symbols.map(({ name, kind, signature }) => ({ name, kind, signature }))).toEqual([
      { name: 'Player', kind: 'class', signature: 'class_name Player' },
      { name: 'speed', kind: 'variable', signature: 'var speed := 10' },
      { name: 'TEAM', kind: 'constant', signature: 'const TEAM = "blue"' },
      { name: 'State', kind: 'enum', signature: 'enum State { IDLE, RUN }' },
      { name: 'spawn', kind: 'function', signature: 'static func spawn() -> Player:' },
    ]);
  });
});
