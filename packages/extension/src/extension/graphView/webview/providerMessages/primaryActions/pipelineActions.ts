import type {
  GraphViewProviderMessageListenerOptions,
  GraphViewProviderMessageListenerSource,
} from '../listener';
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
  _options: GraphViewProviderMessageListenerOptions = {},
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
