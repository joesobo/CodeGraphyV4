import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import {
  assignGraphLayoutOwner,
  createDefaultGraphLayoutSettings,
  normalizeGraphLayoutSettings,
} from '../../../repoSettings/graphLayout/model';
import { getUndoManager } from '../../../undoManager';
import { UpdateGraphLayoutAction } from '../messages/graphLayout';

export interface GraphViewNodeFileEditHandlers {
  timelineActive: boolean;
  canMutateGraphRevision: boolean;
  deleteFiles(paths: string[]): Promise<void>;
  renameFile(filePath: string): Promise<void>;
  createFile(directory: string): Promise<string | void>;
  createFolder(directory: string): Promise<string | void>;
  toggleFavorites(paths: string[]): Promise<void>;
  addToExclude(patterns: string[]): Promise<void>;
  asWebviewUri?(uri: import('vscode').Uri): { toString(): string };
  getConfig?<T>(key: string, defaultValue: T): T;
  sendMessage?(message: ExtensionToWebviewMessage): void;
  updateConfig?(key: string, value: unknown): Promise<void>;
  workspaceFolder?: { uri: import('vscode').Uri };
}

function isTimelineBoundEditMessage(message: WebviewToExtensionMessage): boolean {
  return (
    message.type === 'DELETE_FILES'
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
  if (!handlers.canMutateGraphRevision) {
    return isTimelineBoundEditMessage(message);
  }

  switch (message.type) {
    case 'DELETE_FILES':
      void handlers.deleteFiles(message.payload.paths);
      return true;
    case 'RENAME_FILE':
      void handlers.renameFile(message.payload.path);
      return true;
    case 'CREATE_FILE':
      return createGraphItemInContext(message.payload, directory => handlers.createFile(directory), handlers);
    case 'CREATE_FOLDER':
      return createGraphItemInContext(message.payload, directory => handlers.createFolder(directory), handlers);
    case 'ADD_TO_EXCLUDE':
      void handlers.addToExclude(message.payload.patterns);
      return true;
    default:
      return false;
  }
}

async function createGraphItemInContext(
  payload: { directory: string; ownerSectionId?: string },
  createGraphItem: (directory: string) => Promise<string | void>,
  handlers: GraphViewNodeFileEditHandlers,
): Promise<boolean> {
  const itemId = await createGraphItem(payload.directory);
  if (typeof itemId === 'string' && payload.ownerSectionId) {
    await assignCreatedGraphItemOwner(itemId, payload.ownerSectionId, handlers);
  }
  return true;
}

async function assignCreatedGraphItemOwner(
  itemId: string,
  ownerSectionId: string,
  handlers: GraphViewNodeFileEditHandlers,
): Promise<void> {
  if (!handlers.getConfig || !handlers.sendMessage || !handlers.updateConfig) {
    return;
  }

  const currentLayout = normalizeGraphLayoutSettings(
    handlers.getConfig('graphLayout', createDefaultGraphLayoutSettings()),
  );
  const nextLayout = assignGraphLayoutOwner(currentLayout, {
    itemId,
    itemKind: 'node',
    ownerSectionId,
    updatedAt: new Date().toISOString(),
  });

  await getUndoManager().execute(new UpdateGraphLayoutAction(
    'Place Graph Item',
    {
      asWebviewUri: handlers.asWebviewUri ? uri => handlers.asWebviewUri?.(uri) ?? uri : undefined,
      getConfig: (key, defaultValue) => handlers.getConfig?.(key, defaultValue) ?? defaultValue,
      sendMessage: message => handlers.sendMessage?.(message),
      updateConfig: (key, value) => handlers.updateConfig?.(key, value) ?? Promise.resolve(),
      workspaceFolder: handlers.workspaceFolder,
    },
    currentLayout,
    nextLayout,
  ));
}

export async function applyNodeFileEditMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileEditHandlers,
): Promise<boolean> {
  if (await applyTimelineBoundEditMessage(message, handlers)) {
    return true;
  }

  if (message.type === 'TOGGLE_FAVORITE') {
    void handlers.toggleFavorites(message.payload.paths);
    return true;
  }

  return false;
}
