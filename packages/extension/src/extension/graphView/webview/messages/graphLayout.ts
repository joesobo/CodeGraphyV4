import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import {
  assignGraphLayoutOwner,
  clearGraphLayoutNodePin,
  createGraphLayoutSection,
  createDefaultGraphLayoutSettings,
  deleteGraphLayoutSection,
  normalizeGraphLayoutSettings,
  setGraphLayoutNodeCollapsed,
  setGraphLayoutNodePin,
  updateGraphLayoutSection,
  type GraphLayoutSettings,
} from '../../../repoSettings/graphLayout/model';
import { getUndoManager, type IUndoableAction } from '../../../undoManager';
import { addGraphSectionIconUrls } from '../../graphLayout/message';
import { writeIconImports, type IconImportMessageHandlers } from './iconImports';

export interface GraphLayoutMessageHandlers extends IconImportMessageHandlers {
  asWebviewUri?(uri: import('vscode').Uri): { toString(): string };
  getConfig<T>(key: string, defaultValue: T): T;
  showWarningMessage?(
    message: string,
    options: { modal: boolean },
    deleteAction: string,
  ): Thenable<'Delete' | undefined>;
  updateConfig(key: string, value: unknown): Promise<void>;
  sendMessage(message: ExtensionToWebviewMessage): void;
}

type GraphLayoutPersistenceHandlers = Pick<
  GraphLayoutMessageHandlers,
  'asWebviewUri' | 'getConfig' | 'sendMessage' | 'updateConfig' | 'workspaceFolder'
>;

function readCurrentGraphLayout(handlers: Pick<GraphLayoutMessageHandlers, 'getConfig'>): GraphLayoutSettings {
  return normalizeGraphLayoutSettings(
    handlers.getConfig('graphLayout', createDefaultGraphLayoutSettings()),
  );
}

async function persistAndSendGraphLayout(
  handlers: GraphLayoutPersistenceHandlers,
  graphLayout: GraphLayoutSettings,
  options: { iconUrls?: ReadonlyMap<string, string> } = {},
): Promise<void> {
  await handlers.updateConfig('graphLayout', graphLayout);
  handlers.sendMessage({
    type: 'GRAPH_LAYOUT_UPDATED',
    payload: addGraphSectionIconUrls(graphLayout, {
      asWebviewUri: handlers.asWebviewUri
        ? uri => handlers.asWebviewUri?.(uri) ?? uri
        : undefined,
      iconUrls: options.iconUrls,
      workspaceFolder: handlers.workspaceFolder,
    }),
  });
}

export class UpdateGraphLayoutAction implements IUndoableAction {
  constructor(
    readonly description: string,
    private readonly handlers: GraphLayoutPersistenceHandlers,
    private readonly beforeLayout: GraphLayoutSettings,
    private readonly afterLayout: GraphLayoutSettings,
  ) {}

  async execute(): Promise<void> {
    await persistAndSendGraphLayout(this.handlers, this.afterLayout);
  }

  async undo(): Promise<void> {
    await persistAndSendGraphLayout(this.handlers, this.beforeLayout);
  }
}

async function updateGraphLayoutPin(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_GRAPH_LAYOUT_PIN' }>,
  handlers: GraphLayoutMessageHandlers,
): Promise<void> {
  const nextLayout = setGraphLayoutNodePin(readCurrentGraphLayout(handlers), message.payload);
  await persistAndSendGraphLayout(handlers, nextLayout);
}

async function clearGraphLayoutPin(
  message: Extract<WebviewToExtensionMessage, { type: 'CLEAR_GRAPH_LAYOUT_PIN' }>,
  handlers: GraphLayoutMessageHandlers,
): Promise<void> {
  const nextLayout = clearGraphLayoutNodePin(
    readCurrentGraphLayout(handlers),
    message.payload.nodeId,
    message.payload.graphMode,
  );

  await persistAndSendGraphLayout(handlers, nextLayout);
}

async function updateGraphLayoutCollapse(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_GRAPH_LAYOUT_COLLAPSE' }>,
  handlers: GraphLayoutMessageHandlers,
): Promise<void> {
  const nextLayout = setGraphLayoutNodeCollapsed(
    readCurrentGraphLayout(handlers),
    message.payload.nodeId,
    message.payload.collapsed,
  );

  await persistAndSendGraphLayout(handlers, nextLayout);
}

async function createGraphLayoutSectionFromMessage(
  message: Extract<WebviewToExtensionMessage, { type: 'CREATE_GRAPH_LAYOUT_SECTION' }>,
  handlers: GraphLayoutMessageHandlers,
): Promise<void> {
  const nextLayout = createGraphLayoutSection(readCurrentGraphLayout(handlers), {
    ...message.payload,
    updatedAt: new Date().toISOString(),
  });

  await persistAndSendGraphLayout(handlers, nextLayout);
}

function createGraphSectionIconUrlMap(
  iconImports: Extract<WebviewToExtensionMessage, { type: 'UPDATE_GRAPH_LAYOUT_SECTION' }>['payload']['iconImports'],
): Map<string, string> {
  return new Map(
    (iconImports ?? []).map(iconImport => [
      iconImport.imagePath,
      `data:image/${iconImport.imagePath.endsWith('.svg') ? 'svg+xml' : 'png'};base64,${iconImport.contentsBase64}`,
    ]),
  );
}

async function updateGraphLayoutSectionFromMessage(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_GRAPH_LAYOUT_SECTION' }>,
  handlers: GraphLayoutMessageHandlers,
): Promise<void> {
  const { iconImports, ...patch } = message.payload;
  await writeIconImports(iconImports, handlers);
  const nextLayout = updateGraphLayoutSection(readCurrentGraphLayout(handlers), {
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  await persistAndSendGraphLayout(handlers, nextLayout, {
    iconUrls: createGraphSectionIconUrlMap(iconImports),
  });
}

async function applyPersistedGraphLayoutMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphLayoutMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'UPDATE_GRAPH_LAYOUT_PIN':
      await updateGraphLayoutPin(message, handlers);
      return true;
    case 'CLEAR_GRAPH_LAYOUT_PIN':
      await clearGraphLayoutPin(message, handlers);
      return true;
    case 'UPDATE_GRAPH_LAYOUT_COLLAPSE':
      await updateGraphLayoutCollapse(message, handlers);
      return true;
    case 'CREATE_GRAPH_LAYOUT_SECTION':
      await createGraphLayoutSectionFromMessage(message, handlers);
      return true;
    case 'UPDATE_GRAPH_LAYOUT_SECTION':
      await updateGraphLayoutSectionFromMessage(message, handlers);
      return true;
    default:
      return false;
  }
}

async function applyUndoableGraphLayoutMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphLayoutMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'UPDATE_GRAPH_LAYOUT_OWNER':
      await moveGraphLayoutItem(message, handlers);
      return true;
    case 'DELETE_GRAPH_LAYOUT_SECTION':
      await deleteGraphLayoutSectionWithConfirmation(message, handlers);
      return true;
    default:
      return false;
  }
}

async function moveGraphLayoutItem(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_GRAPH_LAYOUT_OWNER' }>,
  handlers: GraphLayoutMessageHandlers,
): Promise<void> {
  const currentLayout = readCurrentGraphLayout(handlers);
  const nextLayout = assignGraphLayoutOwner(currentLayout, {
    ...message.payload,
    updatedAt: new Date().toISOString(),
  });

  await getUndoManager().execute(new UpdateGraphLayoutAction(
    'Move Graph Item',
    handlers,
    currentLayout,
    nextLayout,
  ));
}

async function deleteGraphLayoutSectionWithConfirmation(
  message: Extract<WebviewToExtensionMessage, { type: 'DELETE_GRAPH_LAYOUT_SECTION' }>,
  handlers: GraphLayoutMessageHandlers,
): Promise<void> {
  const currentLayout = readCurrentGraphLayout(handlers);
  const section = currentLayout.sections[message.payload.sectionId];
  const label = section?.label || message.payload.sectionId;
  const confirm = await handlers.showWarningMessage?.(
    `Are you sure you want to delete Graph Section "${label}"?`,
    { modal: true },
    'Delete',
  );
  if (confirm !== 'Delete') {
    return;
  }

  const nextLayout = deleteGraphLayoutSection(currentLayout, {
    ...message.payload,
    updatedAt: new Date().toISOString(),
  });

  await getUndoManager().execute(new UpdateGraphLayoutAction(
    'Delete Graph Section',
    handlers,
    currentLayout,
    nextLayout,
  ));
}

export async function applyGraphLayoutMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphLayoutMessageHandlers,
): Promise<boolean> {
  if (await applyPersistedGraphLayoutMessage(message, handlers)) {
    return true;
  }

  return applyUndoableGraphLayoutMessage(message, handlers);
}
