import type {
  GraphViewProviderMethodSource,
  GraphViewProviderMethodSourceOwner,
} from './contracts';

export function createGraphViewProviderPublicMethodDelegates(
  owner: GraphViewProviderMethodSourceOwner,
): Pick<GraphViewProviderMethodSource, 'changeView' | 'setDepthLimit' | 'undo' | 'redo'> {
  return {
    changeView: viewId => owner._viewSelectionMethods.changeView(viewId),
    setDepthLimit: depthLimit => owner._viewSelectionMethods.setDepthLimit(depthLimit),
    undo: () => owner._commandMethods.undo(),
    redo: () => owner._commandMethods.redo(),
  };
}
