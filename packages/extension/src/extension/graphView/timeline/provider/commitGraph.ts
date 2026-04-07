import type { IGraphData } from '../../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { GraphViewProviderTimelineDependencies } from './indexing';
import type { GraphViewProviderTimelineSource } from './types';

export async function buildTimelineCommitGraphData(
  source: Pick<
    GraphViewProviderTimelineSource,
    | '_analyzer'
    | '_gitAnalyzer'
    | '_disabledPlugins'
    | '_disabledSources'
  >,
  sha: string,
  dependencies: Pick<
    GraphViewProviderTimelineDependencies,
    'buildTimelineGraphData' | 'getShowOrphans' | 'getWorkspaceFolder'
  >,
): Promise<IGraphData> {
  const rawGraphData = await source._gitAnalyzer!.getGraphDataForCommit(sha);

  return dependencies.buildTimelineGraphData(rawGraphData, {
    disabledPlugins: source._disabledPlugins,
    disabledSources: source._disabledSources,
    showOrphans: dependencies.getShowOrphans(),
    workspaceRoot: dependencies.getWorkspaceFolder()?.uri.fsPath,
    registry: source._analyzer?.registry,
  });
}

export function applyTimelineCommitGraph(
  source: Pick<
    GraphViewProviderTimelineSource,
    '_currentCommitSha' | '_rawGraphData' | '_graphData' | '_applyViewTransform' | '_sendMessage'
  >,
  sha: string,
  graphData: IGraphData,
): void {
  source._currentCommitSha = sha;
  source._rawGraphData = graphData;
  if (source._applyViewTransform) {
    source._applyViewTransform();
  } else {
    source._graphData = graphData;
  }
  source._sendMessage({
    type: 'COMMIT_GRAPH_DATA',
    payload: { sha, graphData: source._graphData },
  } satisfies ExtensionToWebviewMessage);
}
