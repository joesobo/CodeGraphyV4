import { isSafeGraphViewBasename } from '../validation';

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
  if (!isSafeGraphViewBasename(newName)) {
    return {
      kind: 'invalid',
      message: 'Enter a file name without folder separators.',
    };
  }
  return {
    kind: 'rename',
    newPath: filePath.replace(/[^/]+$/, newName),
  };
}
