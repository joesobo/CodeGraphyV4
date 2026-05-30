import { describe, expect, it, vi } from 'vitest';
import type {
  IAccessProvider,
  IGraphViewContextMenuContribution,
  IGraphViewForceAdapterContribution,
  IGraphViewNodeDragEndContribution,
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
      forces: [],
      nodeDragEnd: [],
      contextMenu: [],
      ui: [],
    });
  });
});
