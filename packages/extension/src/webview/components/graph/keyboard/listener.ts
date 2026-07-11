import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import { getGraphKeyboardCommand } from './effects';
import type { GraphKeyboardEffectHandlers } from '../effects/keyboard';
import type { GraphContextMutationAvailability } from '../contextMenu/contracts';

export interface GraphKeyboardListenerOptions {
  dispatchStoreMessage: (message: ExtensionToWebviewMessage) => void;
  fitView: () => void;
  getAllNodeIds: () => string[];
  getMutationAvailability?: () => GraphContextMutationAvailability;
  graphMode: '2d' | '3d';
  openNode: (nodeId: string) => void;
  postMessage: (message: WebviewToExtensionMessage) => void;
  runEffects: (
    effects: Parameters<typeof import('../effects/keyboard').applyKeyboardEffects>[0],
    handlers: GraphKeyboardEffectHandlers,
  ) => void;
  selectedNodeIds: string[];
  setSelection: (nodeIds: string[]) => void;
  zoomGraphView: (factor: number) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function createGraphKeyboardListener({
  dispatchStoreMessage,
  fitView,
  getAllNodeIds,
  getMutationAvailability = () => 'enabled',
  graphMode,
  openNode,
  postMessage,
  runEffects,
  selectedNodeIds,
  setSelection,
  zoomGraphView,
}: GraphKeyboardListenerOptions): (event: KeyboardEvent) => void {
  return (event) => {
    const command = getGraphKeyboardCommand({
      key: event.key,
      isMod: event.ctrlKey || event.metaKey,
      shiftKey: event.shiftKey,
      graphMode,
      selectedNodeIds,
      allNodeIds: getAllNodeIds(),
      targetIsEditable: isEditableTarget(event.target),
      mutationAvailability: getMutationAvailability(),
    });
    if (!command) return;

    if (command.preventDefault) event.preventDefault();
    if (command.stopPropagation) event.stopPropagation();

    runEffects(command.effects, {
      fitView,
      clearSelection: () => setSelection([]),
      openSelectedNodes: (nodeIds) => {
        nodeIds.forEach((nodeId) => {
          openNode(nodeId);
        });
      },
      selectAll: setSelection,
      zoomGraphView,
      postMessage,
      dispatchStoreMessage,
    });
  };
}
