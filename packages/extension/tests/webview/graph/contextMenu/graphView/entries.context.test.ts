import { describe, expect, it, vi } from 'vitest';
import { buildGraphViewContextMenuEntries } from '../../../../../src/webview/components/graph/contextMenu/graphView/entries';
import { createContributions, item, itemLabels, nodeTarget } from './entriesFixture';

describe('buildGraphViewContextMenuEntries action context', () => {
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

  it('passes finite selected node positions', () => {
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
