import { postMessage } from '../../vscodeApi';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { MESSAGE_HANDLERS } from '../messages';
import type { GetState, SetState } from './types';

export function createExtensionMessageActions(set: SetState, get: GetState) {
  return {
    handleExtensionMessage: (message: ExtensionToWebviewMessage) => {
      const handler = MESSAGE_HANDLERS[message.type];
      if (!handler) return;

      const ctx = {
        getState: get,
        postMessage: postMessage as (msg: { type: string; payload: unknown }) => void,
      };
      const update = handler(message, ctx);
      if (update) set(update);
    },
  };
}
