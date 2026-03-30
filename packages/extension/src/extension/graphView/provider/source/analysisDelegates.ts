import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from './contracts';

export function createGraphViewProviderAnalysisMethodDelegates(
  owner: GraphViewProviderMethodSourceOwner,
): Pick<
  GraphViewProviderMethodSource,
  | '_sendMessage'
  | '_sendAvailableViews'
  | '_computeMergedGroups'
  | '_sendGroupsUpdated'
  | '_updateViewContext'
  | '_applyViewTransform'
  | '_sendPluginStatuses'
  | '_sendDecorations'
  | '_sendContextMenuItems'
  | '_sendPluginWebviewInjections'
  | '_analyzeAndSendData'
  | '_doAnalyzeAndSendData'
  | '_markWorkspaceReady'
  | '_isAnalysisStale'
  | '_isAbortError'
> {
  return {
    _sendMessage: message => owner._webviewMethods._sendMessage(message),
    _sendAvailableViews: () => owner._viewContextMethods._sendAvailableViews(),
    _computeMergedGroups: () => owner._pluginResourceMethods._computeMergedGroups(),
    _sendGroupsUpdated: () => owner._pluginMethods._sendGroupsUpdated(),
    _updateViewContext: () => owner._viewContextMethods._updateViewContext(),
    _applyViewTransform: () => owner._viewContextMethods._applyViewTransform(),
    _sendPluginStatuses: () => owner._pluginMethods._sendPluginStatuses(),
    _sendDecorations: () => owner._pluginMethods._sendDecorations(),
    _sendContextMenuItems: () => owner._pluginMethods._sendContextMenuItems(),
    _sendPluginWebviewInjections: () => owner._pluginMethods._sendPluginWebviewInjections(),
    _analyzeAndSendData: () => owner._analysisMethods._analyzeAndSendData(),
    _doAnalyzeAndSendData: (signal, requestId) =>
      owner._analysisMethods._doAnalyzeAndSendData(signal, requestId),
    _markWorkspaceReady: graph => owner._analysisMethods._markWorkspaceReady(graph),
    _isAnalysisStale: (signal, requestId) =>
      owner._analysisMethods._isAnalysisStale(signal, requestId),
    _isAbortError: error => owner._analysisMethods._isAbortError(error),
  };
}
