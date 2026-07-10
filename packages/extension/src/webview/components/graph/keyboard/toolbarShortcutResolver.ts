import type { GraphKeyboardCommand } from './effects';
import { createStoreMessageCommand } from './command/builders';

function getToolbarShortcutMessageType(key: string): 'TOGGLE_DEPTH_MODE' | 'CYCLE_LAYOUT' | null {
  switch (key.toLowerCase()) {
    case 'v':
      return 'TOGGLE_DEPTH_MODE';
    case 'l':
      return 'CYCLE_LAYOUT';
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
