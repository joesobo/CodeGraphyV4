import { describe, expect, it, vi } from 'vitest';
import { buildGraphContextMenuEntries } from '../../../../src/webview/components/graph/contextMenu/build/entries';
import { createContributions, itemLabels } from './graphView/entriesFixture';

describe('Graph View context menu contribution matching', () => {
  it('matches background, node, edge, and multi-selection selectors', () => {
    const graphViewContributions = createContributions([
      {
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.background',
          label: 'Create Runtime Item',
          targets: [{ kind: 'background' }],
          run: vi.fn(),
        },
      },
      {
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.node',
          label: 'Tag Node',
          targets: [{ kind: 'node', nodeTypes: ['file'] }],
          run: vi.fn(),
        },
      },
      {
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.edge',
          label: 'Inspect Import',
          targets: [{ kind: 'edge', edgeKinds: ['import'] }],
          run: vi.fn(),
        },
      },
      {
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.multi',
          label: 'Group Selection',
          targets: [{ kind: 'multiSelection', nodeTypes: ['file'] }],
          run: vi.fn(),
        },
      },
    ]);

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'background', targets: [] },
      favorites: new Set(),
      graphViewContributions,
    }))).toContain('Create Runtime Item');

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: ['src/app.ts'] },
      favorites: new Set(),
      graphViewContributions,
      nodes: [{ id: 'src/app.ts', nodeType: 'file' }],
    }))).toContain('Tag Node');

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'edge', edgeId: 'src/app.ts->src/util.ts#import', targets: ['src/app.ts', 'src/util.ts'] },
      favorites: new Set(),
      graphViewContributions,
      edges: [{ id: 'src/app.ts->src/util.ts#import', kind: 'import' }],
    }))).toContain('Inspect Import');

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: ['src/app.ts', 'src/util.ts'] },
      favorites: new Set(),
      graphViewContributions,
      nodes: [
        { id: 'src/app.ts', nodeType: 'file' },
        { id: 'src/util.ts', nodeType: 'file' },
      ],
    }))).toContain('Group Selection');
  });

  it('matches runtime node and runtime edge type selectors', () => {
    const graphViewContributions = createContributions([
      {
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.runtime-node',
          label: 'Runtime Settings',
          targets: [{ kind: 'runtimeNodeType', runtimeNodeTypes: ['acme-panel'] }],
          run: vi.fn(),
        },
      },
      {
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.runtime-edge',
          label: 'Explain Runtime Link',
          targets: [{ kind: 'runtimeEdgeType', runtimeEdgeTypes: ['acme-link'] }],
          run: vi.fn(),
        },
      },
    ]);

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: ['runtime:frontend'] },
      favorites: new Set(),
      graphViewContributions,
      nodes: [{ id: 'runtime:frontend', runtimeNodeType: 'acme-panel' }],
    }))).toContain('Runtime Settings');

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: {
        kind: 'edge',
        edgeId: 'runtime:frontend->src/app.ts#acme-link',
        targets: ['runtime:frontend', 'src/app.ts'],
      },
      favorites: new Set(),
      graphViewContributions,
      edges: [{
        id: 'runtime:frontend->src/app.ts#acme-link',
        kind: 'reference',
        runtimeEdgeType: 'acme-link',
      }],
    }))).toContain('Explain Runtime Link');
  });

});
