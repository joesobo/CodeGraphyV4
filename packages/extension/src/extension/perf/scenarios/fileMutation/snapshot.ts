import type * as vscode from 'vscode';
import type { FileMutationPerfScenario } from './targets';

export interface ExistingFileState {
  exists: true;
  contents: Uint8Array;
}

export interface MissingFileState {
  exists: false;
}

export type FileState = ExistingFileState | MissingFileState;

export type ReadWorkspaceFile = (
  workspaceFolderUri: vscode.Uri,
  path: string,
) => Promise<Uint8Array | undefined>;

export async function captureFileStates(
  workspaceFolderUri: vscode.Uri,
  paths: readonly string[],
  readFile: ReadWorkspaceFile,
): Promise<Map<string, FileState>> {
  const states = await Promise.all(paths.map(async (path) => {
    const contents = await readFile(workspaceFolderUri, path);
    const state: FileState = contents === undefined
      ? { exists: false }
      : { exists: true, contents: new Uint8Array(contents) };
    return [path, state] as const;
  }));
  return new Map(states);
}

function hasIdenticalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

function hasSameState(before: FileState, after: FileState): boolean {
  if (!before.exists) return !after.exists;
  if (!after.exists) return false;
  return hasIdenticalBytes(before.contents, after.contents);
}

export async function assertRestoredFileStates(
  scenario: FileMutationPerfScenario,
  workspaceFolderUri: vscode.Uri,
  before: ReadonlyMap<string, FileState>,
  readFile: ReadWorkspaceFile,
): Promise<void> {
  const after = await captureFileStates(
    workspaceFolderUri,
    [...before.keys()],
    readFile,
  );
  for (const [path, beforeState] of before) {
    const afterState = after.get(path);
    if (!afterState || !hasSameState(beforeState, afterState)) {
      throw new Error(`Performance ${scenario} scenario did not restore ${path}`);
    }
  }
}
