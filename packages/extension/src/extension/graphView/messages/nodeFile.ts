import type { WebviewToExtensionMessage } from '../../../shared/types';
import {
  applyNodeFileEditMessage,
  type GraphViewNodeFileEditHandlers,
} from './nodeFileEdit';
import {
  applyNodeFileNavigationMessage,
  type GraphViewNodeFileNavigationHandlers,
} from './nodeFileNavigation';
import {
  applyNodeFileOpenMessage,
  type GraphViewNodeFileOpenHandlers,
} from './nodeFileOpen';

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
