import type { WorkspaceFileMutation } from '../../../graphView/provider/file/mutations';

export type FileMutationPerfScenario = 'rename' | 'create' | 'delete';

export interface FileMutationTarget {
  scenario: FileMutationPerfScenario;
  mutation: WorkspaceFileMutation;
  observedPaths: string[];
}

const renameSourcePath = 'src/group-00000/file-000004.ts';
const renameTargetPath = 'src/group-00000/file-000004.perf-renamed.ts';
const createdFilePath = 'src/group-00000/perf-created.ts';
const deletedFilePath = 'src/group-00000/file-000003.ts';

export function createFileMutationTarget(
  scenario: FileMutationPerfScenario,
): FileMutationTarget {
  switch (scenario) {
    case 'rename':
      return {
        scenario,
        mutation: {
          kind: 'rename',
          oldPath: renameSourcePath,
          newPath: renameTargetPath,
        },
        observedPaths: [renameSourcePath, renameTargetPath],
      };
    case 'create':
      return {
        scenario,
        mutation: { kind: 'create', filePath: createdFilePath },
        observedPaths: [createdFilePath],
      };
    case 'delete':
      return {
        scenario,
        mutation: { kind: 'delete', paths: [deletedFilePath] },
        observedPaths: [deletedFilePath],
      };
  }
}
