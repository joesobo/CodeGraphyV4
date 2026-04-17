import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { DagMode, NodeSizeMode } from '../../../../../shared/settings/modes';
import { applyHistoryCommand } from './history';
import { applyGraphModeCommand } from './modes';

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
