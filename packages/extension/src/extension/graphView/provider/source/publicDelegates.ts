import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from './contracts';

export function createGraphViewProviderPublicMethodDelegates(
  owner: GraphViewProviderMethodSourceOwner,
): Pick<
  GraphViewProviderMethodSource,
  | 'changeView'
  | 'setFocusedFile'
  | 'setDepthLimit'
  | 'undo'
  | 'redo'
  | '_notifyExtensionMessage'
> {
  return {
    changeView: viewId => owner._methodContainers.viewSelection.changeView(viewId),
    setFocusedFile: filePath => owner._methodContainers.viewSelection.setFocusedFile(filePath),
    setDepthLimit: depthLimit => owner._methodContainers.viewSelection.setDepthLimit(depthLimit),
    undo: () => owner._methodContainers.command.undo(),
    redo: () => owner._methodContainers.command.redo(),
    _notifyExtensionMessage: message => owner._notifyExtensionMessage(message),
  };
}
