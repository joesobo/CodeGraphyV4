import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import { getGraphKeyboardCommandImpl } from './command/lookup';
import type { GraphContextMutationAvailability } from '../contextMenu/contracts';

export type GraphKeyboardEffect =
  | { kind: 'fitView' }
  | { kind: 'clearSelection' }
  | { kind: 'closePanels' }
  | { kind: 'openSelectedNodes'; nodeIds: string[] }
  | { kind: 'selectAll'; nodeIds: string[] }
  | { kind: 'zoom'; factor: number }
  | { kind: 'postMessage'; message: WebviewToExtensionMessage }
  | { kind: 'dispatchStoreMessage'; message: ExtensionToWebviewMessage };

export interface GraphKeyboardCommand {
  preventDefault: boolean;
  stopPropagation: boolean;
  effects: GraphKeyboardEffect[];
}

export interface GraphKeyboardOptions {
  key: string;
  isMod: boolean;
  shiftKey: boolean;
  graphMode: '2d' | '3d';
  selectedNodeIds: string[];
  allNodeIds: string[];
  targetIsEditable: boolean;
  mutationAvailability?: GraphContextMutationAvailability;
  pasteDirectory?: string;
}

export function getGraphKeyboardCommand(options: GraphKeyboardOptions): GraphKeyboardCommand | null {
  return getGraphKeyboardCommandImpl(options);
}
