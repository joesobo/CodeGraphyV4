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

export interface GraphLayoutMessageHandlers {
  getConfig<T>(key: string, defaultValue: T): T;
  updateConfig(key: string, value: unknown): Promise<void>;
  sendMessage(message: ExtensionToWebviewMessage): void;
}

function readCurrentGraphLayout(handlers: Pick<GraphLayoutMessageHandlers, 'getConfig'>): GraphLayoutSettings {
  return normalizeGraphLayoutSettings(
    handlers.getConfig('graphLayout', createDefaultGraphLayoutSettings()),
  );
}

async function persistAndSendGraphLayout(
  handlers: GraphLayoutMessageHandlers,
  graphLayout: GraphLayoutSettings,
): Promise<void> {
  await handlers.updateConfig('graphLayout', graphLayout);
  handlers.sendMessage({
    type: 'GRAPH_LAYOUT_UPDATED',
    payload: graphLayout,
  });
}

class UpdateGraphLayoutAction implements IUndoableAction {
  constructor(
    readonly description: string,
    private readonly handlers: GraphLayoutMessageHandlers,
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

export async function applyGraphLayoutMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphLayoutMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'UPDATE_GRAPH_LAYOUT_PIN': {
      const nextLayout = setGraphLayoutNodePin(readCurrentGraphLayout(handlers), message.payload);

      await persistAndSendGraphLayout(handlers, nextLayout);
      return true;
    }

    case 'CLEAR_GRAPH_LAYOUT_PIN': {
      const nextLayout = clearGraphLayoutNodePin(
        readCurrentGraphLayout(handlers),
        message.payload.nodeId,
        message.payload.graphMode,
      );

      await persistAndSendGraphLayout(handlers, nextLayout);
      return true;
    }

    case 'UPDATE_GRAPH_LAYOUT_COLLAPSE': {
      const nextLayout = setGraphLayoutNodeCollapsed(
        readCurrentGraphLayout(handlers),
        message.payload.nodeId,
        message.payload.collapsed,
      );

      await persistAndSendGraphLayout(handlers, nextLayout);
      return true;
    }

    case 'CREATE_GRAPH_LAYOUT_SECTION': {
      const nextLayout = createGraphLayoutSection(readCurrentGraphLayout(handlers), {
        ...message.payload,
        updatedAt: new Date().toISOString(),
      });

      await persistAndSendGraphLayout(handlers, nextLayout);
      return true;
    }

    case 'UPDATE_GRAPH_LAYOUT_SECTION': {
      const nextLayout = updateGraphLayoutSection(readCurrentGraphLayout(handlers), {
        ...message.payload,
        updatedAt: new Date().toISOString(),
      });

      await persistAndSendGraphLayout(handlers, nextLayout);
      return true;
    }

    case 'UPDATE_GRAPH_LAYOUT_OWNER': {
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
      return true;
    }

    case 'DELETE_GRAPH_LAYOUT_SECTION': {
      const currentLayout = readCurrentGraphLayout(handlers);
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
      return true;
    }

    default:
      return false;
  }
}
