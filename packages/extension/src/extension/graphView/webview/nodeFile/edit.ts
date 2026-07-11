import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import { clipboardFilesMessageSchema } from '../../../../shared/protocol/clipboardFiles';

export interface GraphViewNodeFileEditHandlers {
  timelineActive: boolean;
  canMutateGraphRevision: boolean;
  cutFiles(paths: string[]): Promise<void>;
  copyFiles(paths: string[]): Promise<void>;
  pasteFiles(directory: string): Promise<void>;
  deleteFiles(paths: string[]): Promise<void>;
  renameFile(filePath: string): Promise<void>;
  createFile(directory: string): Promise<string | void>;
  createFolder(directory: string): Promise<string | void>;
  toggleFavorites(paths: string[]): Promise<void>;
  addToExclude(patterns: string[]): Promise<void>;
}

function isTimelineBoundEditMessage(message: WebviewToExtensionMessage): boolean {
  return (
    message.type === 'DELETE_FILES'
    || message.type === 'CUT_FILES'
    || message.type === 'COPY_FILES'
    || message.type === 'PASTE_FILES'
    || message.type === 'RENAME_FILE'
    || message.type === 'CREATE_FILE'
    || message.type === 'CREATE_FOLDER'
    || message.type === 'ADD_TO_EXCLUDE'
  );
}

function applyTimelineBoundEditMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileEditHandlers,
): boolean | Promise<boolean> {
  if (handlers.timelineActive && !handlers.canMutateGraphRevision) {
    return isTimelineBoundEditMessage(message);
  }

  switch (message.type) {
    case 'CUT_FILES':
    case 'COPY_FILES':
    case 'PASTE_FILES': {
      const parsed = clipboardFilesMessageSchema.safeParse(message);
      if (!parsed.success) return true;
      if (parsed.data.type === 'CUT_FILES') {
        void handlers.cutFiles(parsed.data.payload.paths);
      } else if (parsed.data.type === 'COPY_FILES') {
        void handlers.copyFiles(parsed.data.payload.paths);
      } else {
        void handlers.pasteFiles(parsed.data.payload.directory);
      }
      return true;
    }
    case 'DELETE_FILES':
      void handlers.deleteFiles(message.payload.paths);
      return true;
    case 'RENAME_FILE':
      void handlers.renameFile(message.payload.path);
      return true;
    case 'CREATE_FILE':
      return createGraphItemInContext(message.payload, directory => handlers.createFile(directory));
    case 'CREATE_FOLDER':
      return createGraphItemInContext(message.payload, directory => handlers.createFolder(directory));
    case 'ADD_TO_EXCLUDE':
      void handlers.addToExclude(message.payload.patterns);
      return true;
    default:
      return false;
  }
}

async function createGraphItemInContext(
  payload: { directory: string },
  createGraphItem: (directory: string) => Promise<string | void>,
): Promise<boolean> {
  await createGraphItem(payload.directory);
  return true;
}

export async function applyNodeFileEditMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileEditHandlers,
): Promise<boolean> {
  if (await applyTimelineBoundEditMessage(message, handlers)) {
    return true;
  }

  if (message.type === 'TOGGLE_FAVORITE') {
    await handlers.toggleFavorites(message.payload.paths);
    return true;
  }

  return false;
}
