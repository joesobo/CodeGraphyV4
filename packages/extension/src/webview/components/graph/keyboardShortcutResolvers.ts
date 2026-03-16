import type { GraphKeyboardCommand, GraphKeyboardOptions } from '../graphKeyboardEffects';
import {
  createHistoryCommand,
  createStoreMessageCommand,
  createZoomCommand,
} from './keyboardCommandBuilders';

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

export function getToolbarShortcutCommand(
  key: string,
  isMod: boolean
): GraphKeyboardCommand | null {
  switch (key) {
    case 'v':
    case 'V':
      return !isMod ? createStoreMessageCommand('CYCLE_VIEW') : null;
    case 'l':
    case 'L':
      return !isMod ? createStoreMessageCommand('CYCLE_LAYOUT') : null;
    case 't':
    case 'T':
      return !isMod ? createStoreMessageCommand('TOGGLE_DIMENSION') : null;
    default:
      return null;
  }
}
