import { describe, expect, it, vi } from 'vitest';
import { buildGraphContextMenuEntries } from '../../../../src/webview/components/graph/contextMenu/build/entries';
import { createContributions, findItem, itemLabels } from './graphView/entriesFixture';
import { getGraphContextActionEffects } from '../../../../src/webview/components/graph/contextActions/effects';
import { resolveGraphContextActionContext } from '../../../../src/webview/components/graph/contextActions/context';
import { applyContextEffects } from '../../../../src/webview/components/graph/effects/contextMenu';

describe('Graph View context menu contribution actions', () => {
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
      favorites: new Set(),
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
      favorites: new Set(),
      graphViewContributions,
      nodes: [{ id: 'src/fixed.ts', nodeType: 'file' }],
    });
    expect(itemLabels(pinnedEntries)).toContain('Fix Position');

    const multiSelectionEntries = buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: ['src/fixed.ts', 'src/app.ts'] },
      favorites: new Set(),
      graphViewContributions,
      nodes: [
        { id: 'src/fixed.ts', nodeType: 'file' },
        { id: 'src/app.ts', nodeType: 'file' },
      ],
    });
    expect(itemLabels(multiSelectionEntries)).not.toContain('Fix Position');
    expect(itemLabels(multiSelectionEntries)).not.toContain('Release Position');
  });

  it('keeps later context menu contributions when plugin label or visibility callbacks throw', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const graphViewContributions = createContributions([
      {
        pluginId: 'broken.visibility',
        contribution: {
          id: 'broken-visibility',
          label: 'Broken visibility',
          targets: [{ kind: 'background' }],
          isVisible() {
            throw new Error('visibility failed');
          },
          run: vi.fn(),
        },
      },
      {
        pluginId: 'broken.label',
        contribution: {
          id: 'broken-label',
          label: 'Broken label',
          targets: [{ kind: 'background' }],
          getLabel() {
            throw new Error('label failed');
          },
          run: vi.fn(),
        },
      },
      {
        pluginId: 'healthy.plugin',
        contribution: {
          id: 'healthy-action',
          label: 'Healthy action',
          targets: [{ kind: 'background' }],
          run: vi.fn(),
        },
      },
    ]);

    const entries = buildGraphContextMenuEntries({
      selection: { kind: 'background', targets: [] },
      favorites: new Set(),
      graphViewContributions,
    });

    expect(itemLabels(entries)).toContain('Healthy action');
    expect(errorSpy).toHaveBeenCalledTimes(2);
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
      favorites: new Set(),
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
      favorites: new Set(),
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
      favorites: new Set(),
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
      selectedNodeIds: ['src/app.ts'],
      selectedEdgeIds: [],
      selectedNodePositions: {
        'src/app.ts': { x: 42, y: 24 },
      },
    });
});
});
