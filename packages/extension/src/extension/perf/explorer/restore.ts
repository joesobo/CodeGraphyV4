import type * as vscode from 'vscode';
import type { FileMutationTarget } from '../scenarios/fileMutation/targets';
import {
  assertRestoredFileStates,
  type FileState,
} from '../scenarios/fileMutation/snapshot';
import type { ExplorerComparisonRuntime } from './runtime';

function requireApplied(applied: boolean, scenario: FileMutationTarget['scenario']): void {
  if (!applied) {
    throw new Error(`VS Code did not restore Explorer ${scenario} workspace edit`);
  }
}

export async function restoreExplorerMutation(
  target: FileMutationTarget,
  workspaceFolderUri: vscode.Uri,
  before: ReadonlyMap<string, FileState>,
  runtime: ExplorerComparisonRuntime,
): Promise<void> {
  const mutation = target.mutation;
  switch (mutation.kind) {
    case 'rename':
      requireApplied(
        await runtime.applyRenameFile(
          runtime.joinPath(workspaceFolderUri, mutation.newPath),
          runtime.joinPath(workspaceFolderUri, mutation.oldPath),
        ),
        target.scenario,
      );
      break;
    case 'create':
      requireApplied(
        await runtime.applyDeleteFile(
          runtime.joinPath(workspaceFolderUri, mutation.filePath),
        ),
        target.scenario,
      );
      break;
    case 'delete': {
      const path = mutation.paths[0] ?? '';
      const original = before.get(path);
      if (!original || !original.exists) {
        throw new Error('Explorer delete restoration requires original file bytes');
      }
      const uri = runtime.joinPath(workspaceFolderUri, path);
      requireApplied(await runtime.applyCreateFile(uri), target.scenario);
      await runtime.writeFile(uri, original.contents);
      break;
    }
  }

  await runtime.waitForWorkbenchDispatchTurn();
  await assertRestoredFileStates(
    target.scenario,
    workspaceFolderUri,
    before,
    runtime.readFile,
  );
}
