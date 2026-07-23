import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';

type GraphViewProviderReadContext = Pick<
  GraphViewMessageListenerContext,
  | 'getUserGroups'
  | 'getDepthMode'
  | 'getFilterPatterns'
  | 'getPluginFilterGroups'
  | 'getPluginFilterPatterns'
  | 'getGraphData'
  | 'getAnalyzer'
  | 'getViewContext'
  | 'getFocusedFile'
  | 'workspaceFolder'
>;

export function createGraphViewProviderMessageReadContext(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewProviderReadContext {
  return {
    getUserGroups: () => source._userGroups,
    getDepthMode: () => source._depthMode,
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
  };
}
