import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';

export interface GraphViewNodeFileEditHandlers {
  deleteFiles(paths: string[]): Promise<void>;
  renameFile(filePath: string): Promise<void>;
  createFile(directory: string): Promise<string | void>;
  createFolder(directory: string): Promise<string | void>;
  toggleFavorites(paths: string[]): Promise<void>;
  addToExclude(patterns: string[]): Promise<void>;
}

function applyEditMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileEditHandlers,
): boolean | Promise<boolean> {
  switch (message.type) {
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
  if (await applyEditMessage(message, handlers)) {
    return true;
  }

  if (message.type === 'TOGGLE_FAVORITE') {
    await handlers.toggleFavorites(message.payload.paths);
    return true;
  }

  return false;
}
