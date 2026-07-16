import { describe, expect, it } from 'vitest';
import { getRelationKey } from '../../src/plugins/routing/router/results/keys';
import { relation } from './routingFixture';

describe('plugins/routing', () => {
  it('builds stable relation keys from base relation identity fields', () => {
    expect(getRelationKey(relation({
      kind: 'import',
      sourceId: 'import-source',
      fromFilePath: 'src/a.ts',
      fromNodeId: 'node:a',
      fromSymbolId: 'symbol:a',
      specifier: './b',
      type: 'static',
      variant: 'value',
      toFilePath: 'src/b.ts',
    }))).toBe('import|import-source|src/a.ts|node:a|symbol:a|./b|static|value');
  });

  it('adds node and symbol destinations for non-resolved relation kinds', () => {
    expect(getRelationKey(relation({
      kind: 'import',
      toFilePath: 'src/b.ts',
      toNodeId: 'node:b',
      toSymbolId: 'symbol:b',
      resolvedPath: 'src/resolved.ts',
    }))).toBe('import|source|src/source.ts||||||node:b|symbol:b');
  });

  it('adds file, node, symbol, and resolved destinations for call and reference relations', () => {
    expect(getRelationKey(relation({
      kind: 'call',
      sourceId: 'call-run',
      specifier: 'run',
      toFilePath: 'src/run.ts',
      toNodeId: 'node:run',
      toSymbolId: 'symbol:run',
      resolvedPath: 'src/run.ts',
    }))).toBe('call|call-run|src/source.ts|||run|||src/run.ts|node:run|symbol:run|src/run.ts');

    expect(getRelationKey(relation({
      kind: 'reference',
      sourceId: 'reference-user',
      toFilePath: 'src/user.ts',
    }))).toBe('reference|reference-user|src/source.ts||||||src/user.ts|||');
  });

  it('includes resolved destinations for event relations', () => {
    expect(getRelationKey(relation({
      kind: 'event',
      sourceId: 'unity-event',
      fromSymbolId: 'button-component',
      specifier: 'Toggle',
      toFilePath: 'src/controls-hint.ts',
      resolvedPath: 'src/controls-hint.ts',
    }))).not.toBe(getRelationKey(relation({
      kind: 'event',
      sourceId: 'unity-event',
      fromSymbolId: 'button-component',
      specifier: 'Toggle',
      toFilePath: 'src/menu-controller.ts',
      resolvedPath: 'src/menu-controller.ts',
    })));
  });
});
