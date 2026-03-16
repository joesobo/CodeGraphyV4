import type { WebviewToExtensionMessage } from '../../../../shared/types';

export interface GraphViewNodeFileOpenHandlers {
  timelineActive: boolean;
  currentCommitSha?: string;
  openSelectedNode(nodeId: string): Promise<void>;
  activateNode(nodeId: string): Promise<void>;
  previewFileAtCommit(sha: string, filePath: string): Promise<void>;
  openFile(filePath: string): Promise<void>;
}

export async function applyNodeFileOpenMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileOpenHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'NODE_SELECTED':
      void handlers.openSelectedNode(message.payload.nodeId);
      return true;

    case 'NODE_DOUBLE_CLICKED':
      void handlers.activateNode(message.payload.nodeId);
      return true;

    case 'OPEN_FILE':
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
