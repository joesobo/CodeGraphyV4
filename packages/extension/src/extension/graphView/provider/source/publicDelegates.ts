import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from './contracts';

export function createGraphViewProviderPublicMethodDelegates(
  owner: GraphViewProviderMethodSourceOwner,
): Pick<GraphViewProviderMethodSource, 'changeView' | 'setDepthLimit' | 'undo' | 'redo'> {
  return {
    changeView: viewId => owner._methodContainers.viewSelection.changeView(viewId),
    setDepthLimit: depthLimit => owner._methodContainers.viewSelection.setDepthLimit(depthLimit),
    undo: () => owner._methodContainers.command.undo(),
    redo: () => owner._methodContainers.command.redo(),
  };
}
