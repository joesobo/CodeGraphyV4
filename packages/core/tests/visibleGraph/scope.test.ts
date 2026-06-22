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

  it('projects hidden symbol endpoints back to visible containing files', () => {
    const graphData: IGraphData = {
      nodes: [
        node('scripts/spawning/enemy_spawner.gd'),
        node('resources/enemy_spawn_config.tres'),
        node('resources/enemy_spawn_config.tres#EnemySpawnConfig:resource', 'symbol', symbol({
          id: 'resources/enemy_spawn_config.tres#EnemySpawnConfig:resource',
          name: 'EnemySpawnConfig',
          kind: 'resource',
          filePath: 'resources/enemy_spawn_config.tres',
          pluginKind: 'resource',
          source: 'codegraphy.gdscript',
        })),
      ],
      edges: [{
        id: 'scripts/spawning/enemy_spawner.gd->resources/enemy_spawn_config.tres#EnemySpawnConfig:resource#load:static',
        from: 'scripts/spawning/enemy_spawner.gd',
        to: 'resources/enemy_spawn_config.tres#EnemySpawnConfig:resource',
        kind: 'load',
        sources: [],
      }],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: false },
        { type: 'plugin:codegraphy.gdscript:symbol:resource', enabled: false },
      ],
      edges: [
        { type: 'load', enabled: true },
      ],
    })).toEqual({
      nodes: [
        node('scripts/spawning/enemy_spawner.gd'),
        node('resources/enemy_spawn_config.tres'),
      ],
      edges: [{
        id: 'scripts/spawning/enemy_spawner.gd->resources/enemy_spawn_config.tres#load:static',
        from: 'scripts/spawning/enemy_spawner.gd',
        to: 'resources/enemy_spawn_config.tres',
        kind: 'load',
        sources: [],
      }],
    });
  });

  it('keeps file-level type imports when imported type symbols are visible', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/alias/themePack.ts'),
        node('src/types.ts'),
        node('src/types.ts#PaletteMood:type', 'symbol', symbol({
          id: 'src/types.ts:type:PaletteMood',
          filePath: 'src/types.ts',
          kind: 'type',
          name: 'PaletteMood',
        })),
      ],
      edges: [
        edge('src/alias/themePack.ts', 'src/types.ts', 'type-import'),
        edge('src/alias/themePack.ts', 'src/types.ts#PaletteMood:type', 'type-import'),
        edge('src/types.ts', 'src/types.ts#PaletteMood:type', 'contains'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'symbol:type', enabled: true },
      ],
      edges: [
        { type: 'type-import', enabled: true },
        { type: 'contains', enabled: true },
      ],
    })).toEqual({
      nodes: graphData.nodes,
      edges: [
        edge('src/alias/themePack.ts', 'src/types.ts', 'type-import'),
        edge('src/types.ts', 'src/types.ts#PaletteMood:type', 'contains'),
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

  it('includes scoped symbol definitions under disabled parent node types', () => {
    expect(getDisabledScopedSymbolDefinitions(scopeConfig([
      { type: 'variable', enabled: false },
    ])).map((definition) => definition.id)).toEqual([
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
      'plugin:codegraphy.gdscript:symbol:exported-property',
    ]);
  });

  it('includes Godot scoped symbol definitions under the disabled symbol parent', () => {
    expect(getDisabledScopedSymbolDefinitions(scopeConfig([
      { type: 'symbol', enabled: false },
    ])).map((definition) => definition.id)).toEqual([
      'plugin:codegraphy.gdscript:symbol:scene',
      'plugin:codegraphy.gdscript:symbol:resource',
      'plugin:codegraphy.gdscript:symbol:autoload',
      'plugin:codegraphy.gdscript:symbol:scene-node',
      'plugin:codegraphy.gdscript:symbol:signal',
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
