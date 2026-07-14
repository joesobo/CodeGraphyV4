import type { GraphKeyboardCommand } from './effects';
import { createStoreMessageCommand } from './command/builders';

function getToolbarShortcutMessageType(key: string): 'TOGGLE_DEPTH_MODE' | null {
  return key.toLowerCase() === 'v' ? 'TOGGLE_DEPTH_MODE' : null;
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
