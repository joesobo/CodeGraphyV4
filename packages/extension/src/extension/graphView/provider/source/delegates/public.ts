import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from '../contracts';

export function createGraphViewProviderPublicMethodDelegates(
  owner: GraphViewProviderMethodSourceOwner,
): Pick<
  GraphViewProviderMethodSource,
  | 'setDepthMode'
  | 'setFocusedFile'
  | 'setDepthLimit'
  | 'undo'
  | 'redo'
  | 'refreshIndex'
  | 'refreshGitignoreMetadata'
  | 'refreshAnalysisScope'
  | 'refreshPluginFiles'
  | 'refreshChangedFiles'
  | 'clearCacheAndRefresh'
  | 'invalidatePluginFiles'
  | '_notifyExtensionMessage'
  > {
  return {
    setDepthMode: depthMode => owner._methodContainers.viewSelection.setDepthMode(depthMode),
    setFocusedFile: filePath => owner._methodContainers.viewSelection.setFocusedFile(filePath),
    setDepthLimit: depthLimit => owner._methodContainers.viewSelection.setDepthLimit(depthLimit),
    undo: () => owner._methodContainers.command.undo(),
    redo: () => owner._methodContainers.command.redo(),
    refreshIndex: () => owner._methodContainers.refresh.refreshIndex(),
    refreshGitignoreMetadata: () => owner._methodContainers.refresh.refreshGitignoreMetadata(),
    refreshAnalysisScope: () => owner._methodContainers.refresh.refreshAnalysisScope(),
    refreshPluginFiles: pluginIds => owner._methodContainers.refresh.refreshPluginFiles(pluginIds),
    refreshChangedFiles: filePaths => owner._methodContainers.refresh.refreshChangedFiles(filePaths),
    clearCacheAndRefresh: () => owner._methodContainers.refresh.clearCacheAndRefresh(),
    invalidatePluginFiles: pluginIds => owner.invalidatePluginFiles(pluginIds),
    _notifyExtensionMessage: message => owner._notifyExtensionMessage(message),
  };
}
