import type { ExtensionToWebviewMessage } from '../../../../../shared/protocol/extensionToWebview';
import type { GraphViewProviderMessageListenerSource } from '../listener';
import type { GraphViewProviderPrimaryActions } from './types';

type ViewActions = Pick<
  GraphViewProviderPrimaryActions,
  | 'sendMessage'
  | 'setSearchState'
  | 'applyViewTransform'
  | 'smartRebuild'
>;

export function createViewActions(source: GraphViewProviderMessageListenerSource): ViewActions {
  return {
    sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    setSearchState: searchState => {
      source._searchState = searchState;
    },
    applyViewTransform: () => source._applyViewTransform(),
    smartRebuild: id => source._smartRebuild(id),
  };
}
