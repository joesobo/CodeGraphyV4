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
  | '_sendPluginExporters'
  | '_sendPluginWebviewInjections'
  | '_analyzeAndSendData'
  | '_doAnalyzeAndSendData'
  | '_markWorkspaceReady'
  | '_isAnalysisStale'
  | '_isAbortError'
> {
  return {
    _sendMessage: message => owner._methodContainers.webview._sendMessage(message),
    _sendAvailableViews: () => owner._methodContainers.viewContext._sendAvailableViews(),
    _computeMergedGroups: () => owner._methodContainers.pluginResource._computeMergedGroups(),
    _sendGroupsUpdated: () => owner._methodContainers.plugin._sendGroupsUpdated(),
    _updateViewContext: () => owner._methodContainers.viewContext._updateViewContext(),
    _applyViewTransform: () => owner._methodContainers.viewContext._applyViewTransform(),
    _sendPluginStatuses: () => owner._methodContainers.plugin._sendPluginStatuses(),
    _sendDecorations: () => owner._methodContainers.plugin._sendDecorations(),
    _sendContextMenuItems: () => owner._methodContainers.plugin._sendContextMenuItems(),
    _sendPluginExporters: () => owner._methodContainers.plugin._sendPluginExporters(),
    _sendPluginWebviewInjections: () => owner._methodContainers.plugin._sendPluginWebviewInjections(),
    _analyzeAndSendData: () => owner._methodContainers.analysis._analyzeAndSendData(),
    _doAnalyzeAndSendData: (signal, requestId) =>
      owner._methodContainers.analysis._doAnalyzeAndSendData(signal, requestId),
    _markWorkspaceReady: graph => owner._methodContainers.analysis._markWorkspaceReady(graph),
    _isAnalysisStale: (signal, requestId) =>
      owner._methodContainers.analysis._isAnalysisStale(signal, requestId),
    _isAbortError: error => owner._methodContainers.analysis._isAbortError(error),
  };
}
