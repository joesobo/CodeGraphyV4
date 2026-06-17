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

  it('keeps symbol nodes that are disconnected after edge type filtering', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.cpp'),
        node('src/widget.hpp'),
        node('src/app.cpp#Runner:class', 'symbol', symbol({
          id: 'src/app.cpp:class:Runner',
          kind: 'class',
          name: 'Runner',
        })),
      ],
      edges: [
        edge('src/app.cpp', 'src/widget.hpp', 'import'),
        edge('src/app.cpp', 'src/app.cpp#Runner:class', 'contains'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'symbol:class', enabled: true },
      ],
      edges: [
        { type: 'import', enabled: true },
        { type: 'contains', enabled: false },
      ],
    })).toEqual({
      nodes: [
        node('src/app.cpp'),
        node('src/widget.hpp'),
        node('src/app.cpp#Runner:class', 'symbol', symbol({
          id: 'src/app.cpp:class:Runner',
          kind: 'class',
          name: 'Runner',
        })),
      ],
      edges: [
        edge('src/app.cpp', 'src/widget.hpp', 'import'),
      ],
    });
  });

  it('uses the narrower method row before the broad function row for method symbols', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/runner.cpp'),
        node('src/runner.cpp#TaskRunner::run:method', 'symbol', symbol({
          id: 'src/runner.cpp:method:TaskRunner::run',
          filePath: 'src/runner.cpp',
          kind: 'method',
          name: 'TaskRunner::run',
        })),
      ],
      edges: [
        edge('src/runner.cpp', 'src/runner.cpp#TaskRunner::run:method', 'contains'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'symbol:function', enabled: false },
        { type: 'symbol:method', enabled: true },
      ],
      edges: [
        { type: 'contains', enabled: true },
      ],
    })).toEqual(graphData);
  });

  it('keeps enabled symbol nodes as orphans when unrelated file edges are visible', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/main.c'),
        node('src/logger/logger.h'),
        node('src/logger/logger.h#logger_init:prototype', 'symbol', symbol({
          id: 'src/logger/logger.h:prototype:logger_init',
          filePath: 'src/logger/logger.h',
          kind: 'prototype',
          name: 'logger_init',
        })),
      ],
      edges: [
        edge('src/main.c', 'src/logger/logger.h', 'include'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'symbol:prototype', enabled: true },
      ],
      edges: [
        { type: 'include', enabled: true },
        { type: 'contains', enabled: false },
      ],
    })).toEqual({
      nodes: graphData.nodes,
      edges: [
        edge('src/main.c', 'src/logger/logger.h', 'include'),
      ],
    });
  });

  it('removes duplicate file edges when an equivalent symbol relation edge is visible', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/runner.cpp'),
        node('src/base.hpp'),
        node('src/runner.cpp#Runner:class', 'symbol', symbol({
          id: 'src/runner.cpp:class:Runner',
          filePath: 'src/runner.cpp',
          kind: 'class',
          name: 'Runner',
        })),
        node('src/base.hpp#Base:class', 'symbol', symbol({
          id: 'src/base.hpp:class:Base',
          filePath: 'src/base.hpp',
          kind: 'class',
          name: 'Base',
        })),
      ],
      edges: [
        edge('src/runner.cpp', 'src/base.hpp', 'inherit'),
        edge('src/runner.cpp', 'src/base.hpp#Base:class', 'inherit'),
        edge('src/runner.cpp#Runner:class', 'src/base.hpp#Base:class', 'inherit'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'symbol:class', enabled: true },
      ],
      edges: [
        { type: 'inherit', enabled: true },
      ],
    })).toEqual({
      nodes: graphData.nodes,
      edges: [
        edge('src/runner.cpp#Runner:class', 'src/base.hpp#Base:class', 'inherit'),
      ],
    });
  });

  it('keeps one visible edge for repeated edges with the same identity', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.py#process_data:function', 'symbol', symbol({
          id: 'src/app.py:function:process_data',
          filePath: 'src/app.py',
          kind: 'function',
          name: 'process_data',
        })),
        node('src/format.py#format_output:function', 'symbol', symbol({
          id: 'src/format.py:function:format_output',
          filePath: 'src/format.py',
          kind: 'function',
          name: 'format_output',
        })),
      ],
      edges: [
        edge('src/app.py#process_data:function', 'src/format.py#format_output:function', 'call'),
        edge('src/app.py#process_data:function', 'src/format.py#format_output:function', 'call'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'symbol', enabled: true },
        { type: 'symbol:function', enabled: true },
      ],
      edges: [
        { type: 'call', enabled: true },
      ],
    })).toEqual({
      nodes: graphData.nodes,
      edges: [
        edge('src/app.py#process_data:function', 'src/format.py#format_output:function', 'call'),
      ],
    });
  });

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

  it('does not treat parent toggles as catch-all symbol definitions', () => {
    expect(nodeMatchesScope(
      scopeNode({
        symbol: symbol({ kind: 'variable' }),
      }),
      new Set(),
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

  it('lets more specific symbol rows override broader disabled rows', () => {
    expect(getDisabledSymbolKinds(scopeConfig([
      { type: 'symbol:function', enabled: false },
      { type: 'symbol:method', enabled: true },
    ]))).toEqual(new Set(['function']));
  });

  it('keeps earlier specific symbol rows ahead of later broader rows', () => {
    expect(getDisabledSymbolKinds(scopeConfig([
      { type: 'symbol:method', enabled: false },
      { type: 'symbol:function', enabled: true },
    ]))).toEqual(new Set(['method']));
  });

  it('lets later equal-specificity symbol rows replace earlier rows', () => {
    expect(getDisabledSymbolKinds(scopeConfig([
      { type: 'symbol:class', enabled: false },
      { type: 'symbol:class', enabled: true },
    ]))).toEqual(new Set());
  });


  it('filters Unity component symbols through plugin scope rows', () => {
    const graphData: IGraphData = {
      nodes: [
        node('Assets/Scenes/SampleScene.unity', 'file'),
        node('Assets/Scenes/SampleScene.unity#unity:game-object:1000', 'symbol', symbol({
          id: 'Assets/Scenes/SampleScene.unity#unity:game-object:1000',
          filePath: 'Assets/Scenes/SampleScene.unity',
          kind: 'game-object',
          name: 'Player',
          pluginKind: 'game-object',
          source: 'codegraphy.unity',
          language: 'unity',
        })),
        node('Assets/Scenes/SampleScene.unity#unity:component:1001', 'symbol', symbol({
          id: 'Assets/Scenes/SampleScene.unity#unity:component:1001',
          filePath: 'Assets/Scenes/SampleScene.unity',
          kind: 'component',
          name: 'Transform',
          pluginKind: 'component',
          source: 'codegraphy.unity',
          language: 'unity',
        })),
      ],
      edges: [
        edge('Assets/Scenes/SampleScene.unity', 'Assets/Scenes/SampleScene.unity#unity:game-object:1000', 'contains'),
        edge('Assets/Scenes/SampleScene.unity#unity:game-object:1000', 'Assets/Scenes/SampleScene.unity#unity:component:1001', 'contains'),
      ],
    };

    const result = applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'plugin:codegraphy.unity:symbol', enabled: true },
        { type: 'plugin:codegraphy.unity:symbol:game-object', enabled: true },
        { type: 'plugin:codegraphy.unity:symbol:component', enabled: false },
      ],
      edges: [{ type: 'contains', enabled: true }],
    });

    expect(result.nodes.map((item) => item.id)).toEqual([
      'Assets/Scenes/SampleScene.unity',
      'Assets/Scenes/SampleScene.unity#unity:game-object:1000',
    ]);
    expect(result.edges.map((item) => item.id)).toEqual([
      'Assets/Scenes/SampleScene.unity->Assets/Scenes/SampleScene.unity#unity:game-object:1000#contains',
    ]);
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
