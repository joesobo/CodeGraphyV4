import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';

type GraphViewProviderReadContext = Pick<
  GraphViewMessageListenerContext,
  | 'getTimelineActive'
  | 'getCurrentCommitSha'
  | 'getUserGroups'
  | 'getActiveViewId'
  | 'getDisabledPlugins'
  | 'getDisabledRules'
  | 'getFilterPatterns'
  | 'getGraphData'
  | 'getViewContext'
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
    getUserGroups: () => source._userGroups,
    getActiveViewId: () => source._activeViewId,
    getDisabledPlugins: () => source._disabledPlugins,
    getDisabledRules: () => source._disabledRules,
    getFilterPatterns: () => source._filterPatterns,
    getGraphData: () => source._graphData,
    getViewContext: () => source._viewContext,
    workspaceFolder: dependencies.workspace.workspaceFolders?.[0],
    findNode: targetId => source._graphData.nodes.find(node => node.id === targetId),
    findEdge: targetId => source._graphData.edges.find(edge => edge.id === targetId),
  };
}
