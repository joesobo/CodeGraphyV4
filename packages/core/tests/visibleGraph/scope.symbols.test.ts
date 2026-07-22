import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import type { IGraphNodeTypeDefinition } from '../../src/graphControls/contracts';
import type { VisibleGraphScopeConfig } from '../../src/visibleGraph/contracts';
import { applyGraphScope } from '../../src/visibleGraph/scope';
import { getDisabledScopedSymbolDefinitions } from '../../src/visibleGraph/scopeScopedDefinitions';
import { symbolMatchesScopedDefinition } from '../../src/visibleGraph/scopeSymbolMatch';
import { getDisabledSymbolKinds } from '../../src/visibleGraph/scopeSymbolTypes';

function node(id: string, nodeType?: IGraphNode['nodeType'], symbol?: IGraphNode['symbol']): IGraphNode {
  return {
    id,
    label: id,
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


function symbolGraphNode(symbolValue: IGraphNode['symbol']): IGraphNode {
  return {
    id: 'symbol:User',
    label: 'User',
    nodeType: 'symbol',
    symbol: symbolValue,
  };
}

function scopedDefinition(overrides: Partial<IGraphNodeTypeDefinition> = {}): IGraphNodeTypeDefinition {
  return {
    id: 'symbol',
    label: 'Symbol',
    defaultVisible: true,
    ...overrides,
  };
}


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
