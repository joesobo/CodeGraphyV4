import { describe, expect, it, vi } from 'vitest';
import type {
  IAccessProvider,
  IGraphViewContextMenuContribution,
  IGraphViewForceAdapterContribution,
  IGraphViewNodeDragEndContribution,
  IGraphViewProjectionContribution,
  IGraphViewRuntimeEdgeContribution,
  IGraphViewRuntimeNodeContribution,
  IGraphViewUiSlotContribution,
  IPluginInfo,
} from '@/core/plugins/types/contracts';
import { createMockPlugin } from '../../pluginRegistry.testSupport';
import {
  listAvailableGraphViewContributionsForPlugins,
  listPluginAccessProviders,
} from '@/core/plugins/registry/runtime/state/graphViewContributions';

function pluginInfo(plugin: IPluginInfo['plugin']): IPluginInfo {
  return {
    builtIn: false,
    plugin,
  };
}

function grantingProvider(accesses: readonly string[]): IAccessProvider {
  return {
    id: 'access.test',
    provides: accesses,
    getAccess: vi.fn(async ({ access, workspaceRoot }) => ({
      access,
      reason: workspaceRoot,
      state: 'granted' as const,
    })),
  };
}

describe('core/plugins/registry/runtime/state graph view contributions', () => {
  it('lists only registered access providers from plugin infos', () => {
    const provider = grantingProvider(['pro']);

    expect(listPluginAccessProviders([
      pluginInfo(createMockPlugin({ id: 'plain' })),
      pluginInfo(createMockPlugin({ id: 'access', accessProvider: provider })),
    ])).toEqual([provider]);
  });

  it('collects available graph view contributions across every bucket', async () => {
    const provider = grantingProvider(['pro']);
    const runtimeNode = {
      id: 'runtime-node',
      label: 'Runtime Node',
      createNodes: vi.fn(() => []),
    } as IGraphViewRuntimeNodeContribution;
    const runtimeEdge = {
      id: 'runtime-edge',
      label: 'Runtime Edge',
      createEdges: vi.fn(() => []),
    } as IGraphViewRuntimeEdgeContribution;
    const projection = {
      id: 'projection',
      label: 'Projection',
      project: vi.fn(({ visibleGraph }) => visibleGraph),
    } as IGraphViewProjectionContribution;
    const force = {
      id: 'force',
      label: 'Force',
      create: vi.fn(() => ({ dispose: vi.fn() })),
    } as IGraphViewForceAdapterContribution;
    const nodeDragEnd = {
      id: 'drag',
      label: 'Drag',
      onNodeDragEnd: vi.fn(),
    } as IGraphViewNodeDragEndContribution;
    const contextMenu = {
      id: 'menu',
      label: 'Menu',
      targets: [{ kind: 'background' }],
      run: vi.fn(),
    } as IGraphViewContextMenuContribution;
    const ui = {
      id: 'ui',
      label: 'UI',
      slot: 'graph.toolbar',
      view: { kind: 'command', command: 'test.command' },
    } as IGraphViewUiSlotContribution;
    const plugin = createMockPlugin({
      id: 'visuals',
      accessProvider: provider,
      requiresAccess: 'pro',
      graphView: {
        contextMenu: [contextMenu],
        forces: [force],
        nodeDragEnd: [nodeDragEnd],
        projections: [projection],
        runtimeEdges: [runtimeEdge],
        runtimeNodes: [runtimeNode],
        ui: [ui],
      },
    });

    const contributions = await listAvailableGraphViewContributionsForPlugins(
      [pluginInfo(plugin)],
      { workspaceRoot: '/workspace' },
    );

    expect(provider.getAccess).toHaveBeenCalledWith({
      access: 'pro',
      pluginId: 'visuals',
      workspaceRoot: '/workspace',
    });
    expect(contributions.runtimeNodes).toEqual([{ pluginId: 'visuals', contribution: runtimeNode }]);
    expect(contributions.runtimeEdges).toEqual([{ pluginId: 'visuals', contribution: runtimeEdge }]);
    expect(contributions.projections).toEqual([{ pluginId: 'visuals', contribution: projection }]);
    expect(contributions.forces).toEqual([{ pluginId: 'visuals', contribution: force }]);
    expect(contributions.nodeDragEnd).toEqual([{ pluginId: 'visuals', contribution: nodeDragEnd }]);
    expect(contributions.contextMenu).toEqual([{ pluginId: 'visuals', contribution: contextMenu }]);
    expect(contributions.ui).toEqual([{ pluginId: 'visuals', contribution: ui }]);
  });

  it('skips unavailable plugins and unavailable individual contributions', async () => {
    const provider = grantingProvider(['granted-contribution-access']);
    const availableContribution = {
      id: 'available',
      label: 'Available',
      createNodes: vi.fn(() => []),
    } as IGraphViewRuntimeNodeContribution;
    const lockedContribution = {
      id: 'locked',
      label: 'Locked',
      requiresAccess: 'feature-access',
      createNodes: vi.fn(() => []),
    } as IGraphViewRuntimeNodeContribution;

    const contributions = await listAvailableGraphViewContributionsForPlugins([
      pluginInfo(createMockPlugin({
        id: 'locked-plugin',
        accessProvider: provider,
        requiresAccess: 'plugin-access',
        graphView: {
          runtimeNodes: [{
            id: 'locked-plugin-contribution',
            label: 'Locked Plugin Contribution',
            requiresAccess: 'granted-contribution-access',
            createNodes: vi.fn(() => []),
          }],
        },
      })),
      pluginInfo(createMockPlugin({
        id: 'open-plugin',
        accessProvider: provider,
        graphView: {
          runtimeNodes: [availableContribution, lockedContribution],
        },
      })),
    ]);

    expect(contributions.runtimeNodes).toEqual([
      { pluginId: 'open-plugin', contribution: availableContribution },
    ]);
    expect(contributions.runtimeEdges).toEqual([]);
    expect(contributions.projections).toEqual([]);
    expect(contributions.forces).toEqual([]);
    expect(contributions.nodeDragEnd).toEqual([]);
    expect(contributions.contextMenu).toEqual([]);
    expect(contributions.ui).toEqual([]);
  });

  it('returns an empty contribution set for plugins without graph view contributions', async () => {
    await expect(listAvailableGraphViewContributionsForPlugins([
      pluginInfo(createMockPlugin({ id: 'plain' })),
    ])).resolves.toEqual({
      runtimeNodes: [],
      runtimeEdges: [],
      projections: [],
      forces: [],
      nodeDragEnd: [],
      contextMenu: [],
      ui: [],
    });
  });

  it('isolates a throwing contribution getter and retains healthy menus', async () => {
    const throwingPlugin = createMockPlugin({ id: 'fixture.throwing-menu' });
    Object.defineProperty(throwingPlugin, 'graphView', {
      get: () => {
        throw new Error('deliberate menu failure');
      },
    });
    const menu = {
      id: 'healthy-menu',
      label: 'Healthy Menu',
      targets: [{ kind: 'node' as const }],
      run: vi.fn(),
    };
    const onPluginError = vi.fn();

    const contributions = await listAvailableGraphViewContributionsForPlugins([
      pluginInfo(throwingPlugin),
      pluginInfo(createMockPlugin({
        id: 'fixture.healthy-menu',
        graphView: { contextMenu: [menu] },
      })),
    ], {}, onPluginError);

    expect(contributions.contextMenu).toEqual([{
      pluginId: 'fixture.healthy-menu',
      contribution: expect.objectContaining({
        id: menu.id,
        label: menu.label,
        targets: menu.targets,
      }),
    }]);
    expect(onPluginError).toHaveBeenCalledWith(
      'fixture.throwing-menu',
      expect.objectContaining({ message: 'deliberate menu failure' }),
    );
  });

  it('turns a throwing menu action into a plugin failure without rejecting the host action', async () => {
    const onPluginError = vi.fn();
    const contributions = await listAvailableGraphViewContributionsForPlugins([
      pluginInfo(createMockPlugin({
        id: 'fixture.throwing-menu-run',
        graphView: {
          contextMenu: [{
            id: 'throwing-menu',
            label: 'Throwing Menu',
            targets: [{ kind: 'node' }],
            run: () => {
              throw new Error('deliberate menu run failure');
            },
          }],
        },
      })),
    ], {}, onPluginError);

    await expect(contributions.contextMenu[0].contribution.run({
      target: { kind: 'node' },
      graphMode: '2d',
      timelineActive: false,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    })).resolves.toBeUndefined();
    expect(onPluginError).toHaveBeenCalledWith(
      'fixture.throwing-menu-run',
      expect.objectContaining({ message: 'deliberate menu run failure' }),
    );
  });
});
