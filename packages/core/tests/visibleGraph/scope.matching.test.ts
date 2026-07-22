import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../src/graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../src/graphControls/contracts';
import type { VisibleGraphScopeConfig } from '../../src/visibleGraph/contracts';
import { getDisabledNodeTypes } from '../../src/visibleGraph/scopeDisabled';
import { nodeMatchesScope } from '../../src/visibleGraph/scopeMatch';



function scopeConfig(nodes: VisibleGraphScopeConfig['nodes']): VisibleGraphScopeConfig {
  return { nodes, edges: [] };
}

function symbol(overrides: Partial<NonNullable<IGraphNode['symbol']>>): NonNullable<IGraphNode['symbol']> {
  return {
    id: 'src/app.ts:symbol:App',
    name: 'App',
    kind: 'class',
    filePath: 'src/app.ts',
    ...overrides,
  };
}

function scopeNode(overrides: Partial<IGraphNode>): IGraphNode {
  return {
    id: 'src/app.ts',
    label: 'src/app.ts',
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


describe('visibleGraph/scope', () => {

  it('tracks only directly disabled node types before ancestor matching is applied', () => {
    expect(getDisabledNodeTypes(scopeConfig([
      { type: 'symbol', enabled: false },
      { type: 'variable', enabled: true },
    ]))).toEqual(new Set(['symbol']));
  });

  it('rejects variable nodes when the symbol parent scope is disabled', () => {
    expect(nodeMatchesScope(
      scopeNode({
        nodeType: 'variable',
        symbol: symbol({ kind: 'global' }),
      }),
      new Set(['symbol']),
      new Set(),
      [],
    )).toBe(false);
  });

  it('matches generic variable symbols through the Plain Variable node type', () => {
    expect(nodeMatchesScope(
      scopeNode({
        symbol: symbol({ kind: 'variable' }),
      }),
      new Set(),
      new Set(),
      [],
    )).toBe(true);
  });

  it('rejects generic variable symbols when the Variable parent node type is disabled', () => {
    expect(nodeMatchesScope(
      scopeNode({
        symbol: symbol({ kind: 'variable' }),
      }),
      new Set(['variable']),
      new Set(),
      [],
    )).toBe(false);
  });

  it('rejects generic variable symbols when the Plain Variable node type is disabled', () => {
    expect(nodeMatchesScope(
      scopeNode({
        symbol: symbol({ kind: 'variable' }),
      }),
      new Set(['variable:plain']),
      new Set(),
      [],
    )).toBe(false);
  });

  it('keeps regular disabled node types when the symbol root is enabled', () => {
    expect(getDisabledNodeTypes(scopeConfig([
      { type: 'symbol', enabled: true },
      { type: 'variable', enabled: false },
      { type: 'folder', enabled: false },
    ]))).toEqual(new Set(['variable', 'folder']));
  });

  it('does not infer symbol root state from unrelated disabled types', () => {
    expect(getDisabledNodeTypes(scopeConfig([
      { type: 'folder', enabled: false },
    ]))).toEqual(new Set(['folder']));
  });

  it('rejects nodes with disabled node types', () => {
    expect(nodeMatchesScope(
      scopeNode({ nodeType: 'folder' }),
      new Set(['folder']),
      new Set(),
      [],
    )).toBe(false);
  });

  it('rejects symbols with disabled symbol kinds', () => {
    expect(nodeMatchesScope(
      scopeNode({ symbol: symbol({ kind: 'method' }) }),
      new Set(),
      new Set(['method']),
      [],
    )).toBe(false);
  });

  it('rejects symbols matching a disabled scoped definition', () => {
    expect(nodeMatchesScope(
      scopeNode({
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
      scopeNode({ symbol: symbol({ kind: 'class' }) }),
      new Set(['folder']),
      new Set(['method']),
      [gdscriptScopedDefinition],
    )).toBe(true);
  });
});
