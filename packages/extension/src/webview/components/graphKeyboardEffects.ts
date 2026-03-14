import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../../shared/types';

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
  const { key, isMod, shiftKey, graphMode, selectedNodeIds, allNodeIds, targetIsEditable } = options;

  if (targetIsEditable) return null;

  switch (key) {
    case '0':
      return { preventDefault: true, stopPropagation: false, effects: [{ kind: 'fitView' }] };
    case 'Escape':
      return { preventDefault: true, stopPropagation: false, effects: [{ kind: 'clearSelection' }] };
    case 'Enter':
      return selectedNodeIds.length > 0
        ? {
            preventDefault: true,
            stopPropagation: false,
            effects: [{ kind: 'openSelectedNodes', nodeIds: selectedNodeIds }],
          }
        : null;
    case 'a':
      return isMod
        ? {
            preventDefault: true,
            stopPropagation: false,
            effects: [{ kind: 'selectAll', nodeIds: allNodeIds }],
          }
        : null;
    case '=':
    case '+':
      return !isMod && graphMode === '2d'
        ? { preventDefault: true, stopPropagation: false, effects: [{ kind: 'zoom', factor: 1.2 }] }
        : null;
    case '-':
      return !isMod && graphMode === '2d'
        ? { preventDefault: true, stopPropagation: false, effects: [{ kind: 'zoom', factor: 1 / 1.2 }] }
        : null;
    case 'z':
    case 'Z':
      return isMod
        ? {
            preventDefault: true,
            stopPropagation: true,
            effects: [{ kind: 'postMessage', message: { type: shiftKey ? 'REDO' : 'UNDO' } }],
          }
        : null;
    case 'y':
    case 'Y':
      return isMod
        ? {
            preventDefault: true,
            stopPropagation: true,
            effects: [{ kind: 'postMessage', message: { type: 'REDO' } }],
          }
        : null;
    case 'v':
    case 'V':
      return !isMod
        ? {
            preventDefault: true,
            stopPropagation: false,
            effects: [{ kind: 'dispatchStoreMessage', message: { type: 'CYCLE_VIEW' } }],
          }
        : null;
    case 'l':
    case 'L':
      return !isMod
        ? {
            preventDefault: true,
            stopPropagation: false,
            effects: [{ kind: 'dispatchStoreMessage', message: { type: 'CYCLE_LAYOUT' } }],
          }
        : null;
    case 't':
    case 'T':
      return !isMod
        ? {
            preventDefault: true,
            stopPropagation: false,
            effects: [{ kind: 'dispatchStoreMessage', message: { type: 'TOGGLE_DIMENSION' } }],
          }
        : null;
    default:
      return null;
  }
}
