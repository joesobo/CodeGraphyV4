import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';

export interface GraphViewCommandHandlers {
  undo(): Promise<string | undefined>;
  redo(): Promise<string | undefined>;
  openInEditor(): void;
  showInformationMessage(message: string): void;
  setDepthMode?(depthMode: boolean): PromiseLike<void>;
  setDepthLimit(depthLimit: number): PromiseLike<void>;
  updateDagMode(dagMode: DagMode): PromiseLike<void>;
  updateNodeSizeMode(nodeSizeMode: NodeSizeMode): PromiseLike<void>;
}

async function applyHistoryCommand(
  message: WebviewToExtensionMessage,
  handlers: GraphViewCommandHandlers,
): Promise<boolean> {
  if (message.type === 'UNDO') {
    const undoDescription = await handlers.undo();
    handlers.showInformationMessage(
      undoDescription ? `Undo: ${undoDescription}` : 'Nothing to undo',
    );
    return true;
  }

  if (message.type === 'REDO') {
    const redoDescription = await handlers.redo();
    handlers.showInformationMessage(
      redoDescription ? `Redo: ${redoDescription}` : 'Nothing to redo',
    );
    return true;
  }

  return false;
}

async function applyGraphModeCommand(
  message: WebviewToExtensionMessage,
  handlers: GraphViewCommandHandlers,
): Promise<boolean> {
  if (message.type === 'UPDATE_DEPTH_MODE') {
    await handlers.setDepthMode?.(message.payload.depthMode);
    return true;
  }

  if (message.type === 'CHANGE_DEPTH_LIMIT') {
    await handlers.setDepthLimit(message.payload.depthLimit);
    return true;
  }

  if (message.type === 'UPDATE_DAG_MODE') {
    await handlers.updateDagMode(message.payload.dagMode);
    return true;
  }

  if (message.type === 'UPDATE_NODE_SIZE_MODE') {
    await handlers.updateNodeSizeMode(message.payload.nodeSizeMode);
    return true;
  }

  return false;
}

export async function applyCommandMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewCommandHandlers,
): Promise<boolean> {
  if (await applyHistoryCommand(message, handlers)) {
    return true;
  }

  if (message.type === 'OPEN_IN_EDITOR') {
    handlers.openInEditor();
    return true;
  }

  if (await applyGraphModeCommand(message, handlers)) {
    return true;
  }

  return false;
}
