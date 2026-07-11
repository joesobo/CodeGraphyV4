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
  openFileToSide(filePath: string): Promise<void>;
  findInFolder(filePath: string): Promise<void>;
  closeFileEditor(filePath: string): Promise<void>;
  openFileWith(filePath: string): Promise<void>;
  openInTerminal(filePath: string): Promise<void>;
  compareFiles(leftPath: string, rightPath: string): Promise<void>;
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

function openPathForCurrentTimeline(
  handlers: GraphViewNodeFileOpenHandlers,
  filePath: string,
): void {
  handlers.setFocusedFile(filePath);
  if (handlers.timelineActive && handlers.currentCommitSha) {
    void handlers.previewFileAtCommit(handlers.currentCommitSha, filePath);
    return;
  }

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

      openPathForCurrentTimeline(handlers, message.payload.path);
      return true;

    case 'OPEN_FILES_TO_SIDE':
      await Promise.all(message.payload.paths
        .filter(filePath => canOpenPath(handlers, filePath))
        .map(filePath => handlers.openFileToSide(filePath)));
      return true;

    case 'FIND_IN_FOLDER':
      await handlers.findInFolder(message.payload.path);
      return true;

    case 'CLOSE_FILE_EDITOR':
      await handlers.closeFileEditor(message.payload.path);
      return true;

    case 'OPEN_FILE_WITH':
      await handlers.openFileWith(message.payload.path);
      return true;

    case 'OPEN_IN_TERMINAL':
      await handlers.openInTerminal(message.payload.path);
      return true;

    case 'COMPARE_FILES':
      await handlers.compareFiles(message.payload.leftPath, message.payload.rightPath);
      return true;

    default:
      return false;
  }
}
