import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';

export interface GraphViewNodeFileEditHandlers {
  timelineActive: boolean;
  deleteFiles(paths: string[]): Promise<void>;
  renameFile(filePath: string): Promise<void>;
  createFile(directory: string): Promise<void>;
  toggleFavorites(paths: string[]): Promise<void>;
  addToExclude(patterns: string[]): Promise<void>;
}

export async function applyNodeFileEditMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileEditHandlers,
): Promise<boolean> {
  switch (message.type) {
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

    default:
      return false;
  }
}
