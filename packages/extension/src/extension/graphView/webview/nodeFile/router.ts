import type { WebviewToExtensionMessage } from '../../../../shared/contracts';
import {
  applyNodeFileEditMessage,
  type GraphViewNodeFileEditHandlers,
} from './edit';
import {
  applyNodeFileNavigationMessage,
  type GraphViewNodeFileNavigationHandlers,
} from './navigation';
import {
  applyNodeFileOpenMessage,
  type GraphViewNodeFileOpenHandlers,
} from './open';

export interface GraphViewNodeFileHandlers
  extends GraphViewNodeFileOpenHandlers,
    GraphViewNodeFileEditHandlers,
    GraphViewNodeFileNavigationHandlers {}

export async function applyNodeFileMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileHandlers,
): Promise<boolean> {
  if (await applyNodeFileOpenMessage(message, handlers)) {
    return true;
  }

  if (await applyNodeFileEditMessage(message, handlers)) {
    return true;
  }

  return applyNodeFileNavigationMessage(message, handlers);
}
