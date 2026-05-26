import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../src/graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../src/graphControls/contracts';
import { nodeMatchesScope } from '../../src/visibleGraph/scopeMatch';

function symbol(overrides: Partial<NonNullable<IGraphNode['symbol']>>): NonNullable<IGraphNode['symbol']> {
  return {
    id: 'src/app.ts:symbol:App',
    name: 'App',
    kind: 'class',
    filePath: 'src/app.ts',
    ...overrides,
  };
}

function node(overrides: Partial<IGraphNode>): IGraphNode {
  return {
    id: 'src/app.ts',
    label: 'src/app.ts',
    color: '#111111',
    nodeType: 'file',
    ...overrides,
  };
}

const gdscriptScopedDefinition: IGraphNodeTypeDefinition = {
  id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
  label: 'Godot class_name',
  defaultColor: '#478CBF',
  defaultVisible: false,
  parentId: 'variable',
  matchSymbolKinds: ['class'],
  matchSymbolPluginKind: 'godot-class-name',
  matchSymbolSource: 'codegraphy.gdscript',
  matchSymbolLanguage: 'gdscript',
  matchSymbolFilePath: '**/*.gd',
};

describe('visibleGraph/scopeMatch', () => {
  it('rejects nodes with disabled node types', () => {
    expect(nodeMatchesScope(
      node({ nodeType: 'folder' }),
      new Set(['folder']),
      new Set(),
      [],
    )).toBe(false);
  });

  it('rejects symbols with disabled symbol kinds', () => {
    expect(nodeMatchesScope(
      node({ symbol: symbol({ kind: 'method' }) }),
      new Set(),
      new Set(['method']),
      [],
    )).toBe(false);
  });

  it('rejects symbols matching a disabled scoped definition', () => {
    expect(nodeMatchesScope(
      node({
        symbol: symbol({
          pluginKind: 'godot-class-name',
          source: 'codegraphy.gdscript',
          language: 'gdscript',
          filePath: 'game/player.gd',
        }),
      }),
      new Set(),
      new Set(),
      [gdscriptScopedDefinition],
    )).toBe(false);
  });

  it('keeps nodes that do not match disabled scopes', () => {
    expect(nodeMatchesScope(
      node({ symbol: symbol({ kind: 'class' }) }),
      new Set(['folder']),
      new Set(['method']),
      [gdscriptScopedDefinition],
    )).toBe(true);
  });
});
