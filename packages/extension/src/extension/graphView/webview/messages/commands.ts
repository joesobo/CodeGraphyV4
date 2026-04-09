import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';

export interface GraphViewCommandHandlers {
  undo(): Promise<string | undefined>;
  redo(): Promise<string | undefined>;
  showInformationMessage(message: string): void;
  changeView(viewId: string): PromiseLike<void>;
  setDepthMode?(depthMode: boolean): PromiseLike<void>;
  setDepthLimit(depthLimit: number): PromiseLike<void>;
  updateDagMode(dagMode: DagMode): PromiseLike<void>;
  updateNodeSizeMode(nodeSizeMode: NodeSizeMode): PromiseLike<void>;
}

export async function applyCommandMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewCommandHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'UNDO': {
      const undoDescription = await handlers.undo();
      handlers.showInformationMessage(
        undoDescription ? `Undo: ${undoDescription}` : 'Nothing to undo',
      );
      return true;
    }

    case 'REDO': {
      const redoDescription = await handlers.redo();
      handlers.showInformationMessage(
        redoDescription ? `Redo: ${redoDescription}` : 'Nothing to redo',
      );
      return true;
    }

    case 'CHANGE_VIEW':
      await handlers.changeView(message.payload.viewId);
      return true;

    case 'UPDATE_DEPTH_MODE':
      await handlers.setDepthMode?.(message.payload.depthMode);
      return true;

    case 'CHANGE_DEPTH_LIMIT':
      await handlers.setDepthLimit(message.payload.depthLimit);
      return true;

    case 'UPDATE_DAG_MODE':
      await handlers.updateDagMode(message.payload.dagMode);
      return true;

    case 'UPDATE_NODE_SIZE_MODE':
      await handlers.updateNodeSizeMode(message.payload.nodeSizeMode);
      return true;

    default:
      return false;
  }
}
