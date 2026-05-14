import { describe, expect, it } from 'vitest';
import { readGDScriptDeclaration } from '../../../src/plugin/symbol/declarationText';

describe('readGDScriptDeclaration', () => {
  it('reads decorated functions and preserves the declaration signature', () => {
    expect(readGDScriptDeclaration('@rpc("any_peer", "call_local")    func   sync_state():')).toEqual({
      kind: 'function',
      name: 'sync_state',
      signature: 'func   sync_state():',
    });
  });

  it('reads declaration kinds with flexible whitespace', () => {
    expect(readGDScriptDeclaration('const   TEAM = "blue"')).toEqual({
      kind: 'constant',
      name: 'TEAM',
      signature: 'const   TEAM = "blue"',
    });
    expect(readGDScriptDeclaration('var   speed := 10')).toEqual({
      kind: 'variable',
      name: 'speed',
      signature: 'var   speed := 10',
    });
    expect(readGDScriptDeclaration('enum   State { IDLE, RUN }')).toEqual({
      kind: 'enum',
      name: 'State',
      signature: 'enum   State { IDLE, RUN }',
    });
  });

  it('ignores declaration words that are not at the start of the statement', () => {
    expect(readGDScriptDeclaration('pass func hidden():')).toBeNull();
    expect(readGDScriptDeclaration('x const TEAM = "blue"')).toBeNull();
    expect(readGDScriptDeclaration('call(var hidden)')).toBeNull();
    expect(readGDScriptDeclaration('match enum State:')).toBeNull();
  });
});
