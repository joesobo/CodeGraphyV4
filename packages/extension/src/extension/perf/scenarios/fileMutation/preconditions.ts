import type { WorkspaceFileMutation } from '../../../graphView/provider/file/mutations';
import type { FileState } from './snapshot';
import type { FileMutationPerfScenario } from './targets';

function requireState(
  scenario: FileMutationPerfScenario,
  path: string,
  state: FileState | undefined,
  expectedToExist: boolean,
): void {
  if (state && state.exists === expectedToExist) return;
  const expectation = expectedToExist ? 'exist' : 'be absent';
  throw new Error(`Performance ${scenario} scenario expected ${path} to ${expectation}`);
}

export function assertScenarioPreconditions(
  scenario: FileMutationPerfScenario,
  mutation: WorkspaceFileMutation,
  before: ReadonlyMap<string, FileState>,
): void {
  switch (mutation.kind) {
    case 'rename':
      requireState(scenario, mutation.oldPath, before.get(mutation.oldPath), true);
      requireState(scenario, mutation.newPath, before.get(mutation.newPath), false);
      return;
    case 'create':
      requireState(scenario, mutation.filePath, before.get(mutation.filePath), false);
      return;
    case 'delete':
      for (const path of mutation.paths) {
        requireState(scenario, path, before.get(path), true);
      }
  }
}
