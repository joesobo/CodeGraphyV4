import { describe, expect, it } from 'vitest';
import type {
  IGraphViewContextMenuContribution,
  IGraphViewContributions,
  IGraphViewForceAdapterContribution,
  IGraphViewNodeDragEndContribution,
  IGraphViewProjectionContribution,
  IGraphViewRuntimeEdgeContribution,
  IGraphViewRuntimeNodeContribution,
  IGraphViewUiSlotContribution,
} from '@codegraphy-dev/extension-plugin-api';
import {
  createEmptyWebviewGraphViewContributionSet,
  mergeGraphViewContributions,
  type GraphViewContributionsByPlugin,
} from '../../../../src/webview/pluginHost/manager/contributions';

function runtimeNodeContribution(id: string): IGraphViewRuntimeNodeContribution {
  return { id, label: id, createNodes: () => [] };
}

function runtimeEdgeContribution(id: string): IGraphViewRuntimeEdgeContribution {
  return { id, label: id, createEdges: () => [] };
}

function projectionContribution(id: string): IGraphViewProjectionContribution {
  return { id, label: id, project: context => context.visibleGraph };
}

function forceContribution(id: string): IGraphViewForceAdapterContribution {
  return { id, label: id, create: () => ({ dispose: () => undefined }) };
}

function nodeDragEndContribution(id: string): IGraphViewNodeDragEndContribution {
  return { id, label: id, onNodeDragEnd: () => undefined };
}

function contextMenuContribution(id: string): IGraphViewContextMenuContribution {
  return { id, label: id, targets: [{ kind: 'background' }], run: () => undefined };
}

function uiContribution(id: string): IGraphViewUiSlotContribution {
  return {
    id,
    label: id,
    slot: 'graph.toolbar',
    view: { kind: 'command', command: id },
  };
}

describe('webview/pluginHost/manager/contributions', () => {
  it('creates an empty contribution set for every graph-view contribution kind', () => {
    expect(createEmptyWebviewGraphViewContributionSet()).toEqual({
      runtimeNodes: [],
      runtimeEdges: [],
      projections: [],
      forces: [],
      nodeDragEnd: [],
      contextMenu: [],
      ui: [],
    });
  });

  it('merges all graph-view contribution kinds with plugin ownership metadata', () => {
    const firstPluginContributions: IGraphViewContributions = {
      runtimeNodes: [runtimeNodeContribution('node')],
      runtimeEdges: [runtimeEdgeContribution('edge')],
      projections: [projectionContribution('projection')],
      forces: [forceContribution('force')],
      nodeDragEnd: [nodeDragEndContribution('drag')],
      contextMenu: [contextMenuContribution('menu')],
      ui: [uiContribution('ui')],
    };
    const secondPluginContributions: IGraphViewContributions = {
      runtimeNodes: [runtimeNodeContribution('other-node')],
    };
    const contributions: GraphViewContributionsByPlugin = new Map([
      ['plugin.one', new Set([{
        ...firstPluginContributions,
      }])],
      ['plugin.two', new Set([secondPluginContributions])],
    ]);

    expect(mergeGraphViewContributions(contributions)).toEqual({
      runtimeNodes: [
        { pluginId: 'plugin.one', contribution: firstPluginContributions.runtimeNodes?.[0] },
        { pluginId: 'plugin.two', contribution: secondPluginContributions.runtimeNodes?.[0] },
      ],
      runtimeEdges: [{ pluginId: 'plugin.one', contribution: firstPluginContributions.runtimeEdges?.[0] }],
      projections: [{ pluginId: 'plugin.one', contribution: firstPluginContributions.projections?.[0] }],
      forces: [{ pluginId: 'plugin.one', contribution: firstPluginContributions.forces?.[0] }],
      nodeDragEnd: [{ pluginId: 'plugin.one', contribution: firstPluginContributions.nodeDragEnd?.[0] }],
      contextMenu: [{ pluginId: 'plugin.one', contribution: firstPluginContributions.contextMenu?.[0] }],
      ui: [{ pluginId: 'plugin.one', contribution: firstPluginContributions.ui?.[0] }],
    });
  });

  it('keeps missing contribution kinds empty', () => {
    const contributions: GraphViewContributionsByPlugin = new Map([
      ['plugin.empty', new Set([{}])],
    ]);

    expect(mergeGraphViewContributions(contributions)).toEqual(createEmptyWebviewGraphViewContributionSet());
  });
});
