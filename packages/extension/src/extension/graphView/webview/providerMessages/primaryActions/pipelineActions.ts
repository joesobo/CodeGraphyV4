import type { GraphViewProviderMessageListenerSource } from '../listener';
import type { GraphViewProviderPrimaryActions } from './types';

type PipelineActions = Pick<
  GraphViewProviderPrimaryActions,
  | 'loadAndSendData'
  | 'indexAndSendData'
  | 'analyzeAndSendData'
  | 'refreshIndex'
  | 'refreshAnalysisScope'
  | 'clearCacheAndRefresh'
>;

export function createPipelineActions(
  source: GraphViewProviderMessageListenerSource,
): PipelineActions {
  return {
    loadAndSendData: () => source._loadAndSendData(),
    indexAndSendData: () => source._indexAndSendData(),
    analyzeAndSendData: () => source._analyzeAndSendData(),
    refreshIndex: () => source.refreshIndex(),
    refreshAnalysisScope: () => source.refreshAnalysisScope(),
    clearCacheAndRefresh: () => source.clearCacheAndRefresh(),
  };
}
