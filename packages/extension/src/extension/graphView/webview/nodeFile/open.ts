import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';

export interface GraphViewNodeFileOpenHandlers {
  timelineActive: boolean;
  currentCommitSha?: string;
  canOpenPath?(filePath: string): boolean;
  setFocusedFile(filePath: string | undefined): void;
  openSelectedNode(nodeId: string): Promise<void>;
  activateNode(nodeId: string): Promise<void>;
  previewFileAtCommit(sha: string, filePath: string): Promise<void>;
  openFile(filePath: string): Promise<void>;
}

function canOpenPath(
  handlers: GraphViewNodeFileOpenHandlers,
  filePath: string,
): boolean {
  return handlers.canOpenPath?.(filePath) ?? true;
}

export async function applyNodeFileOpenMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileOpenHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'NODE_SELECTED':
      if (!canOpenPath(handlers, message.payload.nodeId)) {
        handlers.setFocusedFile(undefined);
        return true;
      }

      handlers.setFocusedFile(message.payload.nodeId);
      void handlers.openSelectedNode(message.payload.nodeId);
      return true;

    case 'CLEAR_FOCUSED_FILE':
      handlers.setFocusedFile(undefined);
      return true;

    case 'NODE_DOUBLE_CLICKED':
      if (!canOpenPath(handlers, message.payload.nodeId)) {
        return true;
      }

      void handlers.activateNode(message.payload.nodeId);
      return true;

    case 'OPEN_FILE':
      if (!canOpenPath(handlers, message.payload.path)) {
        handlers.setFocusedFile(undefined);
        return true;
      }

      handlers.setFocusedFile(message.payload.path);
      if (handlers.timelineActive && handlers.currentCommitSha) {
        void handlers.previewFileAtCommit(handlers.currentCommitSha, message.payload.path);
      } else {
        void handlers.openFile(message.payload.path);
      }
      return true;

    default:
      return false;
  }
}
