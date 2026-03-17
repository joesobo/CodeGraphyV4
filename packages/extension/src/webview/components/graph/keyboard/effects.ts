import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../../../../shared/types';
import { getGraphKeyboardCommandImpl } from './commandLookup';

export type GraphKeyboardEffect =
  | { kind: 'fitView' }
  | { kind: 'clearSelection' }
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
}

export function getGraphKeyboardCommand(options: GraphKeyboardOptions): GraphKeyboardCommand | null {
  return getGraphKeyboardCommandImpl(options);
}
