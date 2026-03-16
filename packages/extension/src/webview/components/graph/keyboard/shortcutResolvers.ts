import type { GraphKeyboardCommand, GraphKeyboardOptions } from './effects';
import {
  createHistoryCommand,
  createZoomCommand,
} from './commandBuilders';

const ZOOM_IN_FACTOR = 1.2;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

export function getZoomShortcutCommand(
  key: string,
  isMod: boolean,
  graphMode: GraphKeyboardOptions['graphMode']
): GraphKeyboardCommand | null {
  switch (key) {
    case '=':
    case '+':
      return !isMod && graphMode === '2d' ? createZoomCommand(ZOOM_IN_FACTOR) : null;
    case '-':
      return !isMod && graphMode === '2d' ? createZoomCommand(ZOOM_OUT_FACTOR) : null;
    default:
      return null;
  }
}

export function getHistoryShortcutCommand(
  key: string,
  isMod: boolean,
  shiftKey: boolean
): GraphKeyboardCommand | null {
  switch (key) {
    case 'z':
    case 'Z':
      return isMod ? createHistoryCommand(shiftKey ? 'REDO' : 'UNDO') : null;
    case 'y':
    case 'Y':
      return isMod ? createHistoryCommand('REDO') : null;
    default:
      return null;
  }
}
