import { describe, expect, it, vi } from 'vitest';
import type { CoreGraphViewContributionSet } from '@codegraphy/core';
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
        pluginId: 'codegraphy.organize',
        contribution: {
          id: 'organize.background',
          label: 'Create Section',
          targets: [{ kind: 'background' }],
          run: vi.fn(),
        },
      },
      {
        pluginId: 'codegraphy.organize',
        contribution: {
          id: 'organize.node',
          label: 'Assign Owner',
          targets: [{ kind: 'node', nodeTypes: ['file'] }],
          run: vi.fn(),
        },
      },
      {
        pluginId: 'codegraphy.organize',
        contribution: {
          id: 'organize.edge',
          label: 'Inspect Import',
          targets: [{ kind: 'edge', edgeKinds: ['import'] }],
          run: vi.fn(),
        },
      },
      {
        pluginId: 'codegraphy.organize',
        contribution: {
          id: 'organize.multi',
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
    }))).toContain('Create Section');

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: ['src/app.ts'] },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      nodes: [{ id: 'src/app.ts', nodeType: 'file' }],
    }))).toContain('Assign Owner');

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
        pluginId: 'codegraphy.organize',
        contribution: {
          id: 'organize.section-node',
          label: 'Section Settings',
          targets: [{ kind: 'runtimeNodeType', runtimeNodeTypes: ['graph-section'] }],
          run: vi.fn(),
        },
      },
      {
        pluginId: 'codegraphy.organize',
        contribution: {
          id: 'organize.member-edge',
          label: 'Explain Membership',
          targets: [{ kind: 'runtimeEdgeType', runtimeEdgeTypes: ['section-member'] }],
          run: vi.fn(),
        },
      },
    ]);

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: ['section:frontend'] },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      nodes: [{ id: 'section:frontend', runtimeNodeType: 'graph-section' }],
    }))).toContain('Section Settings');

    expect(itemLabels(buildGraphContextMenuEntries({
      selection: {
        kind: 'edge',
        edgeId: 'section:frontend->src/app.ts#section-member',
        targets: ['section:frontend', 'src/app.ts'],
      },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
      graphViewContributions,
      edges: [{
        id: 'section:frontend->src/app.ts#section-member',
        kind: 'reference',
        runtimeEdgeType: 'section-member',
      }],
    }))).toContain('Explain Membership');
  });

  it('runs matched graph view context menu contributions with selected ids', () => {
    const run = vi.fn();
    const graphViewContributions = createContributions([{
      pluginId: 'codegraphy.organize',
      contribution: {
        id: 'organize.node',
        label: 'Assign Owner',
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

    const action = findItem(entries, 'Assign Owner')?.action;
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
      selectedNodeIds: ['src/app.ts'],
      selectedEdgeIds: [],
    });
  });
});
