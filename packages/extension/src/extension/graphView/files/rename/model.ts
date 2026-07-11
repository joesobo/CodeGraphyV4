import { isSafeGraphViewBasename } from '../validation';
import {
  invalidItemNameMessage,
  leadingSlashItemNameMessage,
  missingItemNameMessage,
  whitespaceItemNameMessage,
} from '../../../../shared/files/messages';

export interface GraphViewRenameInput {
  selection: [number, number];
  value: string;
}

export type GraphViewRenamePlan =
  | { kind: 'unchanged' }
  | { kind: 'invalid'; message: string }
  | { kind: 'rename'; newPath: string };

export function createGraphViewRenameInput(filePath: string): GraphViewRenameInput {
  const value = filePath.split('/').pop() || filePath;
  const extensionIndex = value.lastIndexOf('.');
  return {
    selection: [0, extensionIndex > 0 ? extensionIndex : value.length],
    value,
  };
}

export function planGraphViewRename(
  filePath: string,
  newName: string,
): GraphViewRenamePlan {
  const currentName = filePath.split('/').pop() || filePath;
  if (newName === currentName) return { kind: 'unchanged' };
  if (!newName.trim()) return { kind: 'invalid', message: missingItemNameMessage };
  if (newName.startsWith('/')) {
    return { kind: 'invalid', message: leadingSlashItemNameMessage };
  }
  if (newName !== newName.trim()) {
    return { kind: 'invalid', message: whitespaceItemNameMessage };
  }
  if (!isSafeGraphViewBasename(newName)) {
    return {
      kind: 'invalid',
      message: invalidItemNameMessage(newName),
    };
  }
  return {
    kind: 'rename',
    newPath: filePath.replace(/[^/]+$/, newName),
  };
}
