import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { IGraphViewContributions } from '../api/contracts/webview';

export type GraphViewContributionsByPlugin = Map<string, Set<IGraphViewContributions>>;

export function createEmptyWebviewGraphViewContributionSet(): ExtensionGraphViewContributionSet {
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

type PluginContributionTarget = Array<{ pluginId: string; contribution: unknown }>;

function appendPluginContributions(
  target: PluginContributionTarget,
  pluginId: string,
  contributions: readonly unknown[] | undefined,
): void {
  target.push(...(contributions ?? []).map(contribution => ({ pluginId, contribution })));
}

function mergePluginContributionSet(
  merged: ExtensionGraphViewContributionSet,
  pluginId: string,
  contributions: IGraphViewContributions,
): void {
  appendPluginContributions(merged.runtimeNodes, pluginId, contributions.runtimeNodes);
  appendPluginContributions(merged.runtimeEdges, pluginId, contributions.runtimeEdges);
  appendPluginContributions(merged.projections, pluginId, contributions.projections);
  appendPluginContributions(merged.forces, pluginId, contributions.forces);
  appendPluginContributions(merged.nodeDragEnd, pluginId, contributions.nodeDragEnd);
  appendPluginContributions(merged.contextMenu, pluginId, contributions.contextMenu);
  appendPluginContributions(merged.ui, pluginId, contributions.ui);
}

export function mergeGraphViewContributions(
  contributionsByPlugin: GraphViewContributionsByPlugin,
): ExtensionGraphViewContributionSet {
  const merged = createEmptyWebviewGraphViewContributionSet();
  for (const [pluginId, contributionSets] of contributionsByPlugin) {
    for (const contributions of contributionSets) {
      mergePluginContributionSet(merged, pluginId, contributions);
    }
  }

  return merged;
}
