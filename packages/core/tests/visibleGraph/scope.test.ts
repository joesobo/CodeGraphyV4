import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../src/graphControls/contracts';
import type { VisibleGraphScopeConfig } from '../../src/visibleGraph/contracts';
import { applyGraphScope } from '../../src/visibleGraph/scope';
import { getDisabledNodeTypes } from '../../src/visibleGraph/scopeDisabled';
import { nodeMatchesScope } from '../../src/visibleGraph/scopeMatch';
import { getDisabledScopedSymbolDefinitions } from '../../src/visibleGraph/scopeScopedDefinitions';
import { symbolMatchesScopedDefinition } from '../../src/visibleGraph/scopeSymbolMatch';
import { getDisabledSymbolKinds } from '../../src/visibleGraph/scopeSymbolTypes';

function node(id: string, nodeType?: IGraphNode['nodeType'], symbol?: IGraphNode['symbol']): IGraphNode {
  return {
    id,
    label: id,
    color: '#111111',
    ...(nodeType ? { nodeType } : {}),
    ...(symbol ? { symbol } : {}),
  };
}

function edge(from: string, to: string, kind: IGraphEdge['kind']): IGraphEdge {
  return {
    id: `${from}->${to}#${kind}`,
    from,
    to,
    kind,
    sources: [],
  };
}

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
    color: '#111111',
    nodeType: 'file',
    ...overrides,
  };
}

function symbolGraphNode(symbolValue: IGraphNode['symbol']): IGraphNode {
  return {
    id: 'symbol:User',
    label: 'User',
    color: '#111111',
    nodeType: 'symbol',
    symbol: symbolValue,
  };
}

function scopedDefinition(overrides: Partial<IGraphNodeTypeDefinition> = {}): IGraphNodeTypeDefinition {
  return {
    id: 'symbol',
    label: 'Symbol',
    defaultColor: '#111111',
    defaultVisible: true,
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

const userSymbol: IGraphNode['symbol'] = {
  id: 'symbol:User',
  name: 'User',
  kind: 'class',
  pluginKind: 'class_declaration',
  source: 'tree-sitter',
  language: 'typescript',
  filePath: 'src/user.ts',
};

describe('visibleGraph/scope', () => {
  it('filters disabled node, symbol, and edge types together', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.ts'),
        node('src/generated.ts', undefined, {
          id: 'src/generated.ts:function:generate',
          name: 'generate',
          kind: 'function',
          filePath: 'src/generated.ts',
        }),
        node('src', 'folder'),
        node('src/consumer.ts'),
      ],
      edges: [
        edge('src/app.ts', 'src/consumer.ts', 'import'),
        edge('src/app.ts', 'src/generated.ts', 'reference'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'folder', enabled: false },
        { type: 'symbol:function', enabled: false },
      ],
      edges: [
        { type: 'reference', enabled: false },
      ],
    })).toEqual({
      nodes: [
        node('src/app.ts'),
        node('src/consumer.ts'),
      ],
      edges: [
        edge('src/app.ts', 'src/consumer.ts', 'import'),
      ],
    });
  });

  it('disables variable nodes whenever the symbol root is disabled', () => {
    expect(getDisabledNodeTypes(scopeConfig([
      { type: 'symbol', enabled: false },
      { type: 'variable', enabled: true },
    ]))).toEqual(new Set(['symbol', 'variable']));
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

  it('includes scoped symbol definitions under disabled parent node types', () => {
    expect(getDisabledScopedSymbolDefinitions(scopeConfig([
      { type: 'variable', enabled: false },
    ])).map((definition) => definition.id)).toEqual([
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
    ]);
  });

  it('includes a disabled scoped symbol definition directly', () => {
    expect(getDisabledScopedSymbolDefinitions(scopeConfig([
      { type: 'variable', enabled: true },
      { type: 'plugin:codegraphy.gdscript:symbol:godot-class-name', enabled: false },
    ])).map((definition) => definition.id)).toEqual([
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
    ]);
  });

  it('ignores disabled regular symbol kinds and non-scoped file types', () => {
    expect(getDisabledScopedSymbolDefinitions(scopeConfig([
      { type: 'symbol:function', enabled: false },
      { type: 'folder', enabled: false },
      { type: 'package', enabled: false },
    ]))).toEqual([]);
  });

  it('matches symbols when optional scoped fields are omitted', () => {
    expect(symbolMatchesScopedDefinition(symbolGraphNode(userSymbol), scopedDefinition())).toBe(true);
    expect(symbolMatchesScopedDefinition(symbolGraphNode(userSymbol), scopedDefinition({
      matchSymbolKinds: ['class'],
    }))).toBe(true);
  });

  it('rejects mismatched optional scoped fields independently', () => {
    expect(symbolMatchesScopedDefinition(symbolGraphNode(userSymbol), scopedDefinition({
      matchSymbolPluginKind: 'function_declaration',
    }))).toBe(false);
    expect(symbolMatchesScopedDefinition(symbolGraphNode(userSymbol), scopedDefinition({
      matchSymbolSource: 'codegraphy.gdscript',
    }))).toBe(false);
    expect(symbolMatchesScopedDefinition(symbolGraphNode(userSymbol), scopedDefinition({
      matchSymbolLanguage: 'gdscript',
    }))).toBe(false);
    expect(symbolMatchesScopedDefinition(symbolGraphNode(userSymbol), scopedDefinition({
      matchSymbolFilePath: 'game/**/*.gd',
    }))).toBe(false);
  });

  it('expands disabled symbol types that define multiple symbol kinds', () => {
    expect(getDisabledSymbolKinds(scopeConfig([
      { type: 'symbol:function', enabled: false },
    ]))).toEqual(new Set(['function', 'method']));
  });

  it('falls back to the symbol type suffix when no explicit kinds exist', () => {
    expect(getDisabledSymbolKinds(scopeConfig([
      { type: 'symbol:class', enabled: false },
      { type: 'symbol:interface', enabled: true },
      { type: 'symbol:unknown', enabled: false },
    ]))).toEqual(new Set(['class', 'unknown']));
  });

  it('ignores disabled non-symbol node types', () => {
    expect(getDisabledSymbolKinds(scopeConfig([
      { type: 'variable', enabled: false },
      { type: 'file', enabled: false },
    ]))).toEqual(new Set());
  });
});
