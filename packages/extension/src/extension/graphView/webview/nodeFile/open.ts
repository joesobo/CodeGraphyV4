import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';

export interface GraphViewNodeFileOpenHandlers {
  canOpenPath?(filePath: string): boolean;
  setFocusedFile(filePath: string | undefined): void;
  openSelectedNode(nodeId: string): Promise<void>;
  activateNode(nodeId: string): Promise<void>;
  openFile(filePath: string): Promise<void>;
}

function canOpenPath(
  handlers: GraphViewNodeFileOpenHandlers,
  filePath: string,
): boolean {
  return handlers.canOpenPath?.(filePath) ?? true;
}

function ignoreClosedPath(
  handlers: GraphViewNodeFileOpenHandlers,
  filePath: string,
  clearFocus: boolean = false,
): boolean {
  if (canOpenPath(handlers, filePath)) {
    return false;
  }

  if (clearFocus) {
    handlers.setFocusedFile(undefined);
  }

  return true;
}

function openPath(handlers: GraphViewNodeFileOpenHandlers, filePath: string): void {
  handlers.setFocusedFile(filePath);
  void handlers.openFile(filePath);
}

export async function applyNodeFileOpenMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileOpenHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'NODE_SELECTED':
      if (ignoreClosedPath(handlers, message.payload.nodeId, true)) {
        return true;
      }

      handlers.setFocusedFile(message.payload.nodeId);
      void handlers.openSelectedNode(message.payload.nodeId);
      return true;

    case 'CLEAR_FOCUSED_FILE':
      handlers.setFocusedFile(undefined);
      return true;

    case 'NODE_DOUBLE_CLICKED':
      if (ignoreClosedPath(handlers, message.payload.nodeId)) {
        return true;
      }

      void handlers.activateNode(message.payload.nodeId);
      return true;

    case 'OPEN_FILE':
      if (ignoreClosedPath(handlers, message.payload.path, true)) {
        return true;
      }

      openPath(handlers, message.payload.path);
      return true;

    default:
      return false;
  }
}
