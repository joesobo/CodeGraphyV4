import type { GraphKeyboardCommand } from './effects';
import { createStoreMessageCommand } from './commandBuilders';

function getToolbarShortcutMessageType(key: string): 'TOGGLE_DEPTH_MODE' | 'CYCLE_LAYOUT' | 'TOGGLE_DIMENSION' | null {
  switch (key.toLowerCase()) {
    case 'v':
      return 'TOGGLE_DEPTH_MODE';
    case 'l':
      return 'CYCLE_LAYOUT';
    case 't':
      return 'TOGGLE_DIMENSION';
    default:
      return null;
  }
}

export function getToolbarShortcutCommand(
  key: string,
  isMod: boolean
): GraphKeyboardCommand | null {
  if (isMod) {
    return null;
  }

  const messageType = getToolbarShortcutMessageType(key);
  return messageType ? createStoreMessageCommand(messageType) : null;
}
