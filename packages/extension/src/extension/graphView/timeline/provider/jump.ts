import { applyTimelineCommitGraph, buildTimelineCommitGraphData } from './commitData';
import type { GraphViewProviderTimelineDependencies } from './indexing';
import type { GraphViewProviderTimelineSource } from './contracts';
import { createDefaultGraphViewProviderTimelineDependencies } from '../indexing/defaults';

export async function jumpGraphViewProviderToCommit(
  source: Pick<
    GraphViewProviderTimelineSource,
    | '_analyzer'
    | '_gitAnalyzer'
    | '_currentCommitSha'
    | '_disabledPlugins'
    | '_rawGraphData'
    | '_graphData'
    | '_computeMergedGroups'
    | '_sendGroupsUpdated'
    | '_applyViewTransform'
    | '_sendMessage'
  >,
  sha: string,
  dependencies: Pick<
    GraphViewProviderTimelineDependencies,
    'buildTimelineGraphData' | 'getShowOrphans' | 'getWorkspaceFolder'
  > = createDefaultGraphViewProviderTimelineDependencies(),
): Promise<void> {
  if (!source._gitAnalyzer) return;

  const graphData = await buildTimelineCommitGraphData(source, sha, dependencies);
  applyTimelineCommitGraph(source, sha, graphData);
  source._computeMergedGroups?.();
  source._sendGroupsUpdated?.();
}
