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
  | 'hydrateGraphScope'
  | 'hydratePluginGraphScope'
  | 'clearCacheAndRefresh'
  | '_notifyExtensionMessage'
  > {
  return {
    setDepthMode: depthMode => owner._methodContainers.viewSelection.setDepthMode(depthMode),
    setFocusedFile: filePath => owner._methodContainers.viewSelection.setFocusedFile(filePath),
    setDepthLimit: depthLimit => owner._methodContainers.viewSelection.setDepthLimit(depthLimit),
    undo: () => owner._methodContainers.command.undo(),
    redo: () => owner._methodContainers.command.redo(),
    refreshIndex: () => owner._methodContainers.refresh.refreshIndex(),
    hydrateGraphScope: () => owner._methodContainers.refresh.hydrateGraphScope(),
    hydratePluginGraphScope: pluginIds =>
      owner._methodContainers.refresh.hydratePluginGraphScope(pluginIds),
    clearCacheAndRefresh: () => owner._methodContainers.refresh.clearCacheAndRefresh(),
    _notifyExtensionMessage: message => owner._notifyExtensionMessage(message),
  };
}
