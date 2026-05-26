import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import { applyCollapseProjection } from '../../src/visibleGraph/collapse';
import { applyFilterPatterns } from '../../src/visibleGraph/filter';
import { symbolMatchesScopedDefinition } from '../../src/visibleGraph/scopeSymbolMatch';

function node(id: string, nodeType: IGraphNode['nodeType'] = 'file'): IGraphNode {
  return {
    id,
    label: id,
    color: '#111111',
    nodeType,
  };
}

function edge(from: string, to: string, kind: IGraphEdge['kind'], sources: IGraphEdge['sources'] = []): IGraphEdge {
  return {
    id: `${from}->${to}#${kind}`,
    from,
    to,
    kind,
    sources,
  };
}

describe('visibleGraph collapse and filtering', () => {
  it('matches scoped symbol definitions by kind, plugin metadata, language, and file glob', () => {
    const symbolNode: IGraphNode = {
      ...node('symbol:User'),
      nodeType: 'symbol',
      symbol: {
        id: 'symbol:User',
        name: 'User',
        kind: 'class',
        filePath: 'src/models/user.ts',
        pluginKind: 'class_declaration',
        source: 'tree-sitter',
        language: 'typescript',
      },
    };

    expect(symbolMatchesScopedDefinition(symbolNode, {
      id: 'symbol',
      label: 'Symbols',
      defaultColor: '#ffffff',
      defaultVisible: true,
      matchSymbolKinds: ['class'],
      matchSymbolPluginKind: 'class_declaration',
      matchSymbolSource: 'tree-sitter',
      matchSymbolLanguage: 'typescript',
      matchSymbolFilePath: 'src/**/*.ts',
    })).toBe(true);

    expect(symbolMatchesScopedDefinition(symbolNode, {
      id: 'symbol',
      label: 'Symbols',
      defaultColor: '#ffffff',
      defaultVisible: true,
      matchSymbolKinds: ['function'],
    })).toBe(false);
    expect(symbolMatchesScopedDefinition(node('src/models/user.ts'), {
      id: 'symbol',
      label: 'Symbols',
      defaultColor: '#ffffff',
      defaultVisible: true,
    })).toBe(false);
  });

  it('filters nodes by id or symbol file path and filters edges by id, kind, and endpoints', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/a.ts'),
        {
          ...node('symbol:Hidden'),
          symbol: {
            id: 'symbol:Hidden',
            name: 'Hidden',
            kind: 'function',
            filePath: 'src/generated/hidden.ts',
          },
        },
        node('src/b.ts'),
      ],
      edges: [
        edge('src/a.ts', 'src/b.ts', 'import'),
        edge('src/b.ts', 'src/a.ts', 'reference'),
      ],
    };

    expect(applyFilterPatterns(graphData, {
      patterns: ['src/generated/**', 'src/b.ts->src/a.ts#reference'],
    })).toEqual({
      nodes: [node('src/a.ts'), node('src/b.ts')],
      edges: [edge('src/a.ts', 'src/b.ts', 'import')],
    });

    expect(applyFilterPatterns(graphData, { patterns: [] })).toBe(graphData);
    expect(applyFilterPatterns(graphData, { patterns: ['import'] }).edges).toEqual([
      edge('src/b.ts', 'src/a.ts', 'reference'),
    ]);
  });

  it('hides descendants of collapsed folders and projects external edges onto the visible folder', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src', 'folder'),
        node('src/domain', 'folder'),
        node('src/domain/model.ts'),
        node('src/domain/view.ts'),
        node('src/consumer.ts'),
      ],
      edges: [
        edge('src/domain/model.ts', 'src/domain/view.ts', 'import'),
        edge('src/domain/model.ts', 'src/consumer.ts', 'import', [{
          id: 'plugin-a:import',
          pluginId: 'plugin-a',
          sourceId: 'import',
          label: 'Plugin A',
        }]),
        edge('src/domain/view.ts', 'src/consumer.ts', 'import', [{
          id: 'plugin-b:import',
          pluginId: 'plugin-b',
          sourceId: 'import',
          label: 'Plugin B',
        }]),
      ],
    };

    const collapsed = applyCollapseProjection(graphData, {
      collapsedNodeIds: ['src/domain'],
    });

    expect(collapsed.nodes.map((candidate) => candidate.id)).toEqual([
      'src',
      'src/domain',
      'src/consumer.ts',
    ]);
    expect(collapsed.nodes.find((candidate) => candidate.id === 'src/domain')).toMatchObject({
      isCollapsible: true,
      isCollapsed: true,
      collapsedDescendantCount: 2,
    });
    expect(collapsed.edges).toEqual([{
      id: 'src/domain->src/consumer.ts#import',
      from: 'src/domain',
      to: 'src/consumer.ts',
      kind: 'import',
      sources: [
        {
          id: 'plugin-a:import',
          pluginId: 'plugin-a',
          sourceId: 'import',
          label: 'Plugin A',
        },
        {
          id: 'plugin-b:import',
          pluginId: 'plugin-b',
          sourceId: 'import',
          label: 'Plugin B',
        },
      ],
    }]);
  });

  it('marks folders collapsible even when no folder is currently collapsed', () => {
    const graphData: IGraphData = {
      nodes: [
        node('(root)', 'folder'),
        node('src', 'folder'),
        node('src/app.ts'),
      ],
      edges: [],
    };

    expect(applyCollapseProjection(graphData).nodes).toEqual([
      {
        ...node('(root)', 'folder'),
        isCollapsible: true,
        isCollapsed: false,
      },
      {
        ...node('src', 'folder'),
        isCollapsible: true,
        isCollapsed: false,
      },
      node('src/app.ts'),
    ]);
  });
});
