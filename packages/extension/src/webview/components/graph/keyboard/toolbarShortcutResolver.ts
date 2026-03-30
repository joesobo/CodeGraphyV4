import type { GraphKeyboardCommand } from './effects';
import { createStoreMessageCommand } from './commandBuilders';

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
