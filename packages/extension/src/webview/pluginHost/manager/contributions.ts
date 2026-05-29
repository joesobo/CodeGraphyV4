import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IGraphViewContributions } from '../api/contracts/webview';

export type GraphViewContributionsByPlugin = Map<string, Set<IGraphViewContributions>>;

export function createEmptyWebviewGraphViewContributionSet(): CoreGraphViewContributionSet {
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

export function mergeGraphViewContributions(
  contributionsByPlugin: GraphViewContributionsByPlugin,
): CoreGraphViewContributionSet {
  const merged = createEmptyWebviewGraphViewContributionSet();
  for (const [pluginId, contributionSets] of contributionsByPlugin) {
    for (const contributions of contributionSets) {
      merged.runtimeNodes.push(...(contributions.runtimeNodes ?? []).map(contribution => ({ pluginId, contribution })));
      merged.runtimeEdges.push(...(contributions.runtimeEdges ?? []).map(contribution => ({ pluginId, contribution })));
      merged.projections.push(...(contributions.projections ?? []).map(contribution => ({ pluginId, contribution })));
      merged.forces.push(...(contributions.forces ?? []).map(contribution => ({ pluginId, contribution })));
      merged.nodeDragEnd.push(...(contributions.nodeDragEnd ?? []).map(contribution => ({ pluginId, contribution })));
      merged.contextMenu.push(...(contributions.contextMenu ?? []).map(contribution => ({ pluginId, contribution })));
      merged.ui.push(...(contributions.ui ?? []).map(contribution => ({ pluginId, contribution })));
    }
  }

  return merged;
}
