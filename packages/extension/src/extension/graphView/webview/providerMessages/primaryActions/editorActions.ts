import type { GraphViewProviderMessageListenerSource } from '../listener';
import type { GraphViewProviderPrimaryActions } from './types';

type EditorActions = Pick<GraphViewProviderPrimaryActions, 'openInEditor'>;

export function createEditorActions(source: GraphViewProviderMessageListenerSource): EditorActions {
  return {
    openInEditor: () => source._webviewMethods.openInEditor(),
  };
}
