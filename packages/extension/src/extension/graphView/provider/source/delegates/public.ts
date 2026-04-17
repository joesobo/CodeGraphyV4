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
  | '_notifyExtensionMessage'
> {
  return {
    setDepthMode: depthMode => owner._methodContainers.viewSelection.setDepthMode(depthMode),
    setFocusedFile: filePath => owner._methodContainers.viewSelection.setFocusedFile(filePath),
    setDepthLimit: depthLimit => owner._methodContainers.viewSelection.setDepthLimit(depthLimit),
    undo: () => owner._methodContainers.command.undo(),
    redo: () => owner._methodContainers.command.redo(),
    _notifyExtensionMessage: message => owner._notifyExtensionMessage(message),
  };
}
