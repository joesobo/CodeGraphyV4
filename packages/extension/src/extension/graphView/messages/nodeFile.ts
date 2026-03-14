import type { WebviewToExtensionMessage } from '../../../shared/types';

export interface GraphViewNodeFileHandlers {
  timelineActive: boolean;
  currentCommitSha?: string;
  openSelectedNode(nodeId: string): Promise<void>;
  activateNode(nodeId: string): Promise<void>;
  previewFileAtCommit(sha: string, filePath: string): Promise<void>;
  openFile(filePath: string): Promise<void>;
  revealInExplorer(filePath: string): Promise<void>;
  copyToClipboard(text: string): Promise<void>;
  deleteFiles(paths: string[]): Promise<void>;
  renameFile(filePath: string): Promise<void>;
  createFile(directory: string): Promise<void>;
  toggleFavorites(paths: string[]): Promise<void>;
  addToExclude(patterns: string[]): Promise<void>;
  analyzeAndSendData(): Promise<void>;
  getFileInfo(filePath: string): Promise<void>;
}

export async function applyNodeFileMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileHandlers,
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

    case 'REVEAL_IN_EXPLORER':
      void handlers.revealInExplorer(message.payload.path);
      return true;

    case 'COPY_TO_CLIPBOARD':
      void handlers.copyToClipboard(message.payload.text);
      return true;

    case 'DELETE_FILES':
      if (!handlers.timelineActive) {
        void handlers.deleteFiles(message.payload.paths);
      }
      return true;

    case 'RENAME_FILE':
      if (!handlers.timelineActive) {
        void handlers.renameFile(message.payload.path);
      }
      return true;

    case 'CREATE_FILE':
      if (!handlers.timelineActive) {
        void handlers.createFile(message.payload.directory);
      }
      return true;

    case 'TOGGLE_FAVORITE':
      void handlers.toggleFavorites(message.payload.paths);
      return true;

    case 'ADD_TO_EXCLUDE':
      if (!handlers.timelineActive) {
        void handlers.addToExclude(message.payload.patterns);
      }
      return true;

    case 'REFRESH_GRAPH':
      await handlers.analyzeAndSendData();
      return true;

    case 'GET_FILE_INFO':
      void handlers.getFileInfo(message.payload.path);
      return true;

    default:
      return false;
  }
}
