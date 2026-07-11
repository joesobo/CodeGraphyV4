import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import { describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';
import type { GraphContextNodeTarget } from '../../../../../src/webview/components/graph/contextMenu/decision/targets';
import { buildGraphViewContextMenuEntries } from '../../../../../src/webview/components/graph/contextMenu/graphView/entries';

function createContributions(
  contextMenu: CoreGraphViewContributionSet['contextMenu'],
): CoreGraphViewContributionSet {
  return {
    runtimeNodes: [],
    runtimeEdges: [],
    projections: [],
    forces: [],
    nodeDragEnd: [],
    contextMenu,
    ui: [],
  };
}

function itemLabels(entries: readonly GraphContextMenuEntry[]): string[] {
  return entries
    .filter((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> => entry.kind === 'item')
    .map(entry => entry.label);
}

function item(entries: readonly GraphContextMenuEntry[], label: string): Extract<GraphContextMenuEntry, { kind: 'item' }> {
  const match = entries.find((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> =>
    entry.kind === 'item' && entry.label === label
  );
  expect(match).toBeDefined();
  return match!;
}

function nodeTarget(overrides: Partial<GraphContextNodeTarget>): GraphContextNodeTarget {
  return {
    id: 'node-1',
    nodeKind: 'file',
    nodeType: 'file',
    ...overrides,
  };
}

describe('buildGraphViewContextMenuEntries', () => {
  it('returns no entries when there are no matching graph view contributions', () => {
    expect(buildGraphViewContextMenuEntries({
      decision: { kind: 'background' },
      selection: { kind: 'background', targets: [] },
    })).toEqual([]);

    const graphViewContributions = createContributions([{
      pluginId: 'acme.tools',
      contribution: {
        id: 'node-only',
        label: 'Node Only',
        targets: [{ kind: 'node', nodeTypes: ['file'] }],
        run: vi.fn(),
      },
    }]);

    expect(buildGraphViewContextMenuEntries({
      decision: { kind: 'background' },
      selection: { kind: 'background', targets: [] },
      graphViewContributions,
    })).toEqual([]);
  });

  it('adds the plugin separator by default and can omit it', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.tools',
      contribution: {
        id: 'create',
        label: 'Create Runtime Item',
        targets: [{ kind: 'background' }],
        run: vi.fn(),
      },
    }]);
    const options = {
      decision: { kind: 'background' as const },
      selection: { kind: 'background' as const, targets: [] },
      graphViewContributions,
    };

    expect(buildGraphViewContextMenuEntries(options)[0]).toEqual({
      kind: 'separator',
      id: 'graph-view-plugins-separator',
    });
    const entriesWithoutSeparator = buildGraphViewContextMenuEntries({
      ...options,
      includeSeparator: false,
    });
    expect(itemLabels(entriesWithoutSeparator)).toEqual(['Create Runtime Item']);
    expect(entriesWithoutSeparator[0]?.kind).toBe('item');
    expect(item(entriesWithoutSeparator, 'Create Runtime Item').action).toMatchObject({
      kind: 'graphViewPlugin',
      context: { graphMode: '2d' },
    });
  });

  it('keeps create-menu contributions out of the default placement', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.tools',
      contribution: {
        id: 'new-runtime-node',
        label: 'New Runtime Node...',
        placement: { menu: 'create' },
        targets: [{ kind: 'background' }],
        run: vi.fn(),
      },
    }]);
    const options = {
      decision: { kind: 'background' as const },
      selection: { kind: 'background' as const, targets: [] },
      graphViewContributions,
      includeSeparator: false,
    };

    expect(buildGraphViewContextMenuEntries(options)).toEqual([]);
    expect(itemLabels(buildGraphViewContextMenuEntries({
      ...options,
      placement: 'create',
    }))).toEqual(['New Runtime Node...']);
  });

  it('builds stable graph view plugin actions for edge selections', () => {
    const run = vi.fn();
    const graphViewContributions = createContributions([{
      pluginId: 'acme.tools',
      contribution: {
        id: 'inspect-runtime-link',
        label: 'Inspect Runtime Link',
        targets: [{ kind: 'runtimeEdgeType', runtimeEdgeTypes: ['runtime-link'] }],
        run,
      },
    }]);
    const entries = buildGraphViewContextMenuEntries({
      decision: {
        kind: 'edge',
        edgeId: 'source->target#runtime-link',
        targets: ['source', 'target'],
      },
      selection: {
        kind: 'edge',
        edgeId: 'source->target#runtime-link',
        targets: ['source', 'target'],
      },
      edges: [{ id: 'source->target#runtime-link', runtimeEdgeType: 'runtime-link' }],
      graphMode: '2d',
      graphViewContributions,
      includeSeparator: false,
    });

    expect(item(entries, 'Inspect Runtime Link')).toMatchObject({
      id: 'graph-view-plugin-acme.tools-inspect-runtime-link',
      action: {
        kind: 'graphViewPlugin',
        pluginId: 'acme.tools',
        contributionId: 'inspect-runtime-link',
        context: {
          graphMode: '2d',
          selectedEdgeIds: ['source->target#runtime-link'],
          selectedNodeIds: [],
          target: { kind: 'runtimeEdgeType', runtimeEdgeTypes: ['runtime-link'] },
        },
      },
    });
  });

  it('requires node selectors to satisfy both node and runtime node filters', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.tools',
      contribution: {
        id: 'section-file',
        label: 'Section File Action',
        targets: [{ kind: 'node', nodeTypes: ['file'], runtimeNodeTypes: ['section'] }],
        run: vi.fn(),
      },
    }]);
    const options = {
      decision: { kind: 'singleFileNode' as const, target: nodeTarget({ id: 'file-a' }) },
      selection: { kind: 'node' as const, targets: ['file-a'] },
      graphViewContributions,
      includeSeparator: false,
    };

    expect(buildGraphViewContextMenuEntries({
      ...options,
      decision: {
        kind: 'singleFileNode',
        target: nodeTarget({ id: 'file-a', runtimeNodeType: 'other' }),
      },
    })).toEqual([]);
    expect(itemLabels(buildGraphViewContextMenuEntries({
      ...options,
      decision: {
        kind: 'singleFileNode',
        target: nodeTarget({ id: 'file-a', runtimeNodeType: 'section' }),
      },
    }))).toEqual(['Section File Action']);
  });

  it('requires every selected node to match multi-selection selectors', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.tools',
      contribution: {
        id: 'group-files',
        label: 'Group Files',
        targets: [{ kind: 'multiSelection', nodeTypes: ['file'] }],
        run: vi.fn(),
      },
    }]);
    const selection = { kind: 'node' as const, targets: ['a.ts', 'b.ts'] };
    const options = {
      graphViewContributions,
      includeSeparator: false,
      selection,
    };

    expect(buildGraphViewContextMenuEntries({
      ...options,
      decision: { kind: 'singleFileNode', target: nodeTarget({ id: 'a.ts' }) },
    })).toEqual([]);
    expect(buildGraphViewContextMenuEntries({
      ...options,
      decision: {
        kind: 'mixedNodeSelection',
        targets: [
          nodeTarget({ id: 'a.ts' }),
          nodeTarget({ id: 'asset.png', nodeType: 'asset' }),
        ],
      },
    })).toEqual([]);
    expect(itemLabels(buildGraphViewContextMenuEntries({
      ...options,
      decision: {
        kind: 'multiFileNodes',
        targets: [
          nodeTarget({ id: 'a.ts' }),
          nodeTarget({ id: 'b.ts' }),
        ],
      },
    }))).toEqual(['Group Files']);
  });

  it('requires edge selectors to satisfy both edge kind and runtime edge filters', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.tools',
      contribution: {
        id: 'explain-runtime-import',
        label: 'Explain Runtime Import',
        targets: [{ kind: 'edge', edgeKinds: ['import'], runtimeEdgeTypes: ['runtime-link'] }],
        run: vi.fn(),
      },
    }]);
    const options = {
      decision: {
        kind: 'edge' as const,
        edgeId: 'source->target#import',
        targets: ['source', 'target'],
      },
      selection: {
        kind: 'edge' as const,
        edgeId: 'source->target#import',
        targets: ['source', 'target'],
      },
      graphViewContributions,
      includeSeparator: false,
    };

    expect(buildGraphViewContextMenuEntries({
      ...options,
      edges: [{ id: 'source->target#import', kind: 'import', runtimeEdgeType: 'other' }],
    })).toEqual([]);
    expect(buildGraphViewContextMenuEntries(options)).toEqual([]);
    expect(itemLabels(buildGraphViewContextMenuEntries({
      ...options,
      edges: [{ id: 'source->target#import', kind: 'import', runtimeEdgeType: 'runtime-link' }],
    }))).toEqual(['Explain Runtime Import']);
  });

  it('matches the edge with the selected edge id before evaluating selectors', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.tools',
      contribution: {
        id: 'explain-runtime-edge',
        label: 'Explain Runtime Edge',
        targets: [{ kind: 'runtimeEdgeType', runtimeEdgeTypes: ['runtime-link'] }],
        run: vi.fn(),
      },
    }]);

    expect(itemLabels(buildGraphViewContextMenuEntries({
      decision: { kind: 'edge', edgeId: 'correct-edge', targets: ['source', 'target'] },
      selection: { kind: 'edge', edgeId: 'correct-edge', targets: ['source', 'target'] },
      edges: [
        { id: 'wrong-edge', runtimeEdgeType: 'other' },
        { id: 'correct-edge', runtimeEdgeType: 'runtime-link' },
      ],
      graphViewContributions,
      includeSeparator: false,
    }))).toEqual(['Explain Runtime Edge']);
  });

  it('passes finite selected node positions with z coordinates', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.tools',
      contribution: {
        id: 'pin-selection',
        label: 'Pin Selection',
        targets: [{ kind: 'multiSelection', nodeTypes: ['file'] }],
        run: vi.fn(),
      },
    }]);
    const entries = buildGraphViewContextMenuEntries({
      decision: {
        kind: 'multiFileNodes',
        targets: [
          nodeTarget({ id: 'a.ts' }),
          nodeTarget({ id: 'b.ts' }),
        ],
      },
      selection: { kind: 'node', targets: ['a.ts', 'b.ts'] },
      nodes: [
        { id: 'a.ts', nodeType: 'file', x: 1, y: 2 },
        { id: 'b.ts', nodeType: 'file', x: Number.NaN, y: 4 },
      ],
      graphViewContributions,
      includeSeparator: false,
    });

    expect(item(entries, 'Pin Selection').action).toMatchObject({
      kind: 'graphViewPlugin',
      context: {
        selectedNodeIds: ['a.ts', 'b.ts'],
        selectedNodePositions: {
          'a.ts': { x: 1, y: 2 },
        },
      },
    });
  });

  it('does not pass selected node positions for edge selections', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.tools',
      contribution: {
        id: 'inspect-edge',
        label: 'Inspect Edge',
        targets: [{ kind: 'edge' }],
        run: vi.fn(),
      },
    }]);
    const entries = buildGraphViewContextMenuEntries({
      decision: { kind: 'edge', edgeId: 'a->b#import', targets: ['a.ts', 'b.ts'] },
      selection: {
        kind: 'edge',
        edgeId: 'a->b#import',
        targets: ['a.ts', 'b.ts'],
      },
      edges: [{ id: 'a->b#import' }],
      nodes: [
        { id: 'a.ts', nodeType: 'file', x: 1, y: 2 },
        { id: 'b.ts', nodeType: 'file', x: 3, y: 4 },
      ],
      graphViewContributions,
      includeSeparator: false,
    });

    expect(item(entries, 'Inspect Edge').action).toMatchObject({
      kind: 'graphViewPlugin',
      context: expect.not.objectContaining({
        selectedNodePositions: expect.anything(),
      }),
    });
  });
});
