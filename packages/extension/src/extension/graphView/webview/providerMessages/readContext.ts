import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';

type GraphViewProviderReadContext = Pick<
  GraphViewMessageListenerContext,
  | 'getTimelineActive'
  | 'getCurrentCommitSha'
  | 'getCanMutateGraphRevision'
  | 'getUserGroups'
  | 'getDepthMode'
  | 'getDisabledPlugins'
  | 'getFilterPatterns'
  | 'getPluginFilterGroups'
  | 'getPluginFilterPatterns'
  | 'getGraphData'
  | 'getAnalyzer'
  | 'getViewContext'
  | 'getFocusedFile'
  | 'workspaceFolder'
  | 'findNode'
  | 'findEdge'
>;

export function createGraphViewProviderMessageReadContext(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewProviderReadContext {
  return {
    getTimelineActive: () => source._timelineActive,
    getCurrentCommitSha: () => source._currentCommitSha,
    getCanMutateGraphRevision: () => {
      if (!source._timelineActive) {
        return true;
      }

      const currentHeadSha = source._gitAnalyzer?.getCachedCommitList()?.at(-1)?.sha;
      return !!currentHeadSha && source._currentCommitSha === currentHeadSha;
    },
    getUserGroups: () => source._userGroups,
    getDepthMode: () => source._depthMode,
    getDisabledPlugins: () => source._disabledPlugins,
    getFilterPatterns: () => source._filterPatterns,
    getPluginFilterPatterns: () =>
      typeof source._analyzer?.getPluginFilterPatterns === 'function'
        ? source._analyzer.getPluginFilterPatterns()
        : [],
    getPluginFilterGroups: () =>
      typeof source._analyzer?.getPluginFilterGroups === 'function'
        ? source._analyzer.getPluginFilterGroups(source._disabledPlugins)
        : [],
    getGraphData: () => source._graphData,
    getAnalyzer: () => source._analyzer,
    getViewContext: () => source._viewContext,
    getFocusedFile: () => source._viewContext.focusedFile,
    workspaceFolder: dependencies.workspace.workspaceFolders?.[0],
    findNode: targetId => source._graphData.nodes.find(node => node.id === targetId),
    findEdge: targetId => source._graphData.edges.find(edge => edge.id === targetId),
  };
}
