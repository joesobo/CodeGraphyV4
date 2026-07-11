import { describe, expect, it, vi } from 'vitest';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import { buildGraphContextMenuEntries } from '../../../../src/webview/components/graph/contextMenu/build/entries';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';
import { getGraphContextActionEffects } from '../../../../src/webview/components/graph/contextActions/effects';
import { resolveGraphContextActionContext } from '../../../../src/webview/components/graph/contextActions/context';
import { applyContextEffects } from '../../../../src/webview/components/graph/effects/contextMenu';

function createEmptyContributions(): CoreGraphViewContributionSet {
  return {
    runtimeNodes: [],
    runtimeEdges: [],
    projections: [],
    forces: [],
    nodeDragEnd: [],
    contextMenu: [],
    ui: [],
  };
}

function createContributions(
  contextMenu: CoreGraphViewContributionSet['contextMenu'],
): CoreGraphViewContributionSet {
  return {
    ...createEmptyContributions(),
    contextMenu,
  };
}

function itemLabels(entries: readonly GraphContextMenuEntry[]): string[] {
  return entries
    .filter((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> => entry.kind === 'item')
    .map(entry => entry.label);
}

function findItem(entries: readonly GraphContextMenuEntry[], label: string) {
  return entries.find((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> =>
    entry.kind === 'item' && entry.label === label
  );
}

describe('Graph View context menu contributions', () => {
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
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
    }))).toContain('Create Runtime Item');

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: ['src/app.ts'] },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      nodes: [{ id: 'src/app.ts', nodeType: 'file' }],
    }))).toContain('Tag Node');

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'edge', edgeId: 'src/app.ts->src/util.ts#import', targets: ['src/app.ts', 'src/util.ts'] },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      edges: [{ id: 'src/app.ts->src/util.ts#import', kind: 'import' }],
    }))).toContain('Inspect Import');

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: ['src/app.ts', 'src/util.ts'] },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
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
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      nodes: [{ id: 'runtime:frontend', runtimeNodeType: 'acme-panel' }],
    }))).toContain('Runtime Settings');

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: {
        kind: 'edge',
        edgeId: 'runtime:frontend->src/app.ts#acme-link',
        targets: ['runtime:frontend', 'src/app.ts'],
      },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      edges: [{
        id: 'runtime:frontend->src/app.ts#acme-link',
        kind: 'reference',
        runtimeEdgeType: 'acme-link',
      }],
    }))).toContain('Explain Runtime Link');
  });

  it('runs matched graph view context menu contributions with selected ids', () => {
    const run = vi.fn();
    const graphViewContributions = createContributions([{
      pluginId: 'acme.graph-tools',
      contribution: {
        id: 'acme.node',
        label: 'Tag Node',
        targets: [{ kind: 'node', nodeTypes: ['file'] }],
        run,
      },
    }]);
    const selection = { kind: 'node' as const, targets: ['src/app.ts'] };
    const nodes = [{ id: 'src/app.ts', nodeType: 'file' }];
    const entries = buildGraphContextMenuEntries({
      selection,
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      nodes,
    });

    const action = findItem(entries, 'Tag Node')?.action;
    expect(action).toBeDefined();

    const effects = getGraphContextActionEffects(
      action!,
      resolveGraphContextActionContext(selection, { nodes }),
    );
    applyContextEffects(effects, {
      clearCachedFile: vi.fn(),
      fitView: vi.fn(),
      focusNode: vi.fn(),
      postMessage: vi.fn(),
    });

    expect(run).toHaveBeenCalledWith({
      target: { kind: 'node', nodeTypes: ['file'] },
      timelineActive: false,
      selectedNodeIds: ['src/app.ts'],
      selectedEdgeIds: [],
    });
  });

  it('lets graph view plugins resolve labels and visibility from the run context', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.graph-tools',
      contribution: {
        id: 'acme.fixed-position',
        label: 'Fix Position',
        getLabel: context =>
          context.selectedNodeIds.includes('src/fixed.ts') ? 'Release Position' : 'Fix Position',
        isVisible: context => context.selectedNodeIds.length === 1,
        targets: [{ kind: 'node', nodeTypes: ['file'] }],
        run: vi.fn(),
      },
    }]);

    const pinnedEntries = buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: ['src/pinned.ts'] },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      nodes: [{ id: 'src/fixed.ts', nodeType: 'file' }],
    });
    expect(itemLabels(pinnedEntries)).toContain('Fix Position');

    const multiSelectionEntries = buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: ['src/fixed.ts', 'src/app.ts'] },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      nodes: [
        { id: 'src/fixed.ts', nodeType: 'file' },
        { id: 'src/app.ts', nodeType: 'file' },
      ],
    });
    expect(itemLabels(multiSelectionEntries)).not.toContain('Fix Position');
    expect(itemLabels(multiSelectionEntries)).not.toContain('Release Position');
  });

  it('passes timeline state to graph view plugin visibility checks', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.graph-tools',
      contribution: {
        id: 'acme.live-action',
        label: 'Live Action',
        isVisible: context => context.timelineActive === false,
        targets: [{ kind: 'background' }],
        run: vi.fn(),
      },
    }]);
    const buildEntries = (timelineActive: boolean) => buildGraphContextMenuEntries({
      selection: { kind: 'background', targets: [] },
      timelineActive,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
    });

    expect(itemLabels(buildEntries(false))).toContain('Live Action');
    expect(itemLabels(buildEntries(true))).not.toContain('Live Action');
  });

  it('passes background graph positions to graph view plugin menu actions', () => {
    const run = vi.fn();
    const graphViewContributions = createContributions([{
      pluginId: 'acme.graph-tools',
      contribution: {
        id: 'acme.create-runtime-item',
        label: 'Create Runtime Item',
        targets: [{ kind: 'background' }],
        run,
      },
    }]);
    const selection = {
      kind: 'background' as const,
      graphPosition: { x: 120, y: 80 },
      targets: [],
    };
    const entries = buildGraphContextMenuEntries({
      selection,
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
    });

    const action = findItem(entries, 'Create Runtime Item')?.action;
    expect(action).toBeDefined();

    const effects = getGraphContextActionEffects(
      action!,
      resolveGraphContextActionContext(selection, { nodes: [] }),
    );
    applyContextEffects(effects, {
      clearCachedFile: vi.fn(),
      fitView: vi.fn(),
      focusNode: vi.fn(),
      postMessage: vi.fn(),
    });

    expect(run).toHaveBeenCalledWith({
      target: { kind: 'background' },
      timelineActive: false,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      graphPosition: { x: 120, y: 80 },
    });
  });

  it('places graph view create-menu contributions with the background filesystem create actions', () => {
    const graphViewContributions = createContributions([{
      pluginId: 'acme.graph-tools',
      contribution: {
        id: 'acme.new-plugin-node',
        label: 'New Plugin Node...',
        placement: { menu: 'create' },
        targets: [{ kind: 'background' }],
        run: vi.fn(),
      },
    }]);

    const entries = buildGraphContextMenuEntries({
      selection: { kind: 'background', targets: [] },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
    });

    expect(itemLabels(entries).slice(0, 3)).toEqual([
      'New File',
      'New Folder',
      'New Plugin Node...',
    ]);
  });

  it('passes selected node graph positions to graph view plugin menu actions', () => {
    const run = vi.fn();
    const graphViewContributions = createContributions([{
      pluginId: 'acme.graph-tools',
      contribution: {
        id: 'acme.fixed-position',
        label: 'Fix Position',
        targets: [{ kind: 'node', nodeTypes: ['file'] }],
        run,
      },
    }]);
    const selection = { kind: 'node' as const, targets: ['src/app.ts'] };
    const entries = buildGraphContextMenuEntries({
      selection,
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      nodes: [{ id: 'src/app.ts', nodeType: 'file', x: 42, y: 24 }],
    });

    const action = findItem(entries, 'Fix Position')?.action;
    expect(action).toBeDefined();

    const effects = getGraphContextActionEffects(
      action!,
      resolveGraphContextActionContext(selection, { nodes: [] }),
    );
    applyContextEffects(effects, {
      clearCachedFile: vi.fn(),
      fitView: vi.fn(),
      focusNode: vi.fn(),
      postMessage: vi.fn(),
    });

    expect(run).toHaveBeenCalledWith({
      target: { kind: 'node', nodeTypes: ['file'] },
      timelineActive: false,
      selectedNodeIds: ['src/app.ts'],
      selectedEdgeIds: [],
      selectedNodePositions: {
        'src/app.ts': { x: 42, y: 24 },
      },
    });
  });
});
