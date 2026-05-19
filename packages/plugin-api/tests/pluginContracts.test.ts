import { describe, expectTypeOf, it } from 'vitest';

import type {
  CodeGraphyAccessKey,
  IAccessProvider,
  IGraphViewContextMenuContribution,
  IGraphViewForceAdapterContribution,
  IGraphViewProjectionContribution,
  IGraphViewRuntimeEdgeContribution,
  IGraphViewRuntimeNodeContribution,
  IGraphViewUiSlotContribution,
  IPlugin,
  IPluginDataHost,
} from '../src';

describe('plugin API contracts', () => {
  it('lets Pro register access plumbing and contribute account UI without owning Organize behavior', () => {
    const organizeAccess = 'organize' as CodeGraphyAccessKey;

    const plugin = {
      id: 'codegraphy.pro',
      name: 'CodeGraphy Pro',
      version: '0.1.0',
      apiVersion: '^2.0.0',
      supportedExtensions: [],
      accessProvider: {
        id: 'codegraphy.pro.access',
        provides: [organizeAccess],
        async getAccess() {
          return {
            access: organizeAccess,
            state: 'granted',
          };
        },
      } satisfies IAccessProvider,
      graphView: {
        ui: [{
          id: 'codegraphy.pro.account',
          slot: 'graph.toolbar',
          label: 'Account',
          view: { kind: 'command', command: 'codegraphy.pro.account' },
        } satisfies IGraphViewUiSlotContribution],
      },
    } satisfies IPlugin;

    expectTypeOf(plugin.accessProvider).toMatchTypeOf<IAccessProvider>();
    expectTypeOf(plugin.graphView.ui[0].slot).toEqualTypeOf<'graph.toolbar'>();
  });

  it('lets Organize contribute gated runtime graph behavior through public Graph View contracts', () => {
    const organizeAccess = 'organize' as CodeGraphyAccessKey;

    const runtimeNode = {
      id: 'codegraphy.organize.section-node',
      label: 'Section Node',
      requiresAccess: organizeAccess,
      createNodes() {
        return [{
          id: 'section:frontend',
          label: 'Frontend',
          color: '#84cc16',
          nodeType: 'organize:section',
        }];
      },
    } satisfies IGraphViewRuntimeNodeContribution;

    const runtimeEdge = {
      id: 'codegraphy.organize.section-member-edge',
      label: 'Section Member Edge',
      requiresAccess: organizeAccess,
      createEdges() {
        return [{
          id: 'section:frontend->src/App.tsx#organize:member',
          from: 'section:frontend',
          to: 'src/App.tsx',
          kind: 'organize:member',
          sources: [],
        }];
      },
    } satisfies IGraphViewRuntimeEdgeContribution;

    const projection = {
      id: 'codegraphy.organize.collapse',
      label: 'Collapse Projection',
      requiresAccess: organizeAccess,
      project({ visibleGraph }) {
        return visibleGraph;
      },
    } satisfies IGraphViewProjectionContribution;

    const force = {
      id: 'codegraphy.organize.section-physics',
      label: 'Section Physics',
      requiresAccess: organizeAccess,
      create() {
        return {
          tick() {},
          dispose() {},
        };
      },
    } satisfies IGraphViewForceAdapterContribution;

    const contextMenu = {
      id: 'codegraphy.organize.assign-section',
      label: 'Assign to Section',
      requiresAccess: organizeAccess,
      targets: [{ kind: 'multiSelection' }],
      run() {},
    } satisfies IGraphViewContextMenuContribution;

    const plugin = {
      id: 'codegraphy.organize',
      name: 'CodeGraphy Organize',
      version: '0.1.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['*'],
      requiresAccess: organizeAccess,
      graphView: {
        runtimeNodes: [runtimeNode],
        runtimeEdges: [runtimeEdge],
        projections: [projection],
        forces: [force],
        contextMenu: [contextMenu],
      },
    } satisfies IPlugin;

    expectTypeOf(plugin.graphView.forces[0]).toMatchTypeOf<IGraphViewForceAdapterContribution>();
    expectTypeOf(plugin.graphView.contextMenu[0].targets[0]).toMatchTypeOf<{ kind: 'multiSelection' }>();
  });

  it('exposes Obsidian-style plugin-owned data persistence', async () => {
    const host = {
      loadData(fallback) {
        return fallback;
      },
      async saveData(_data, _options) {},
    } satisfies IPluginDataHost;

    expectTypeOf(host.loadData({ expanded: true })).toEqualTypeOf<{ expanded: boolean }>();
    await host.saveData({ expanded: false }, { undoLabel: 'Collapse section' });
  });
});
