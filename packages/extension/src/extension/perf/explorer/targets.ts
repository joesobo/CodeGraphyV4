import {
  createFileMutationTarget,
  type FileMutationTarget,
} from '../scenarios/fileMutation/targets';

export const PERF_EXPLORER_REVEAL_TARGET_PATH = 'src/group-00000/file-000000.ts';

export interface ExplorerComparisonTargets {
  rename: FileMutationTarget;
  create: FileMutationTarget;
  delete: FileMutationTarget;
  revealPath: string;
}

export function createExplorerComparisonTargets(): ExplorerComparisonTargets {
  return {
    rename: createFileMutationTarget('rename'),
    create: createFileMutationTarget('create'),
    delete: createFileMutationTarget('delete'),
    revealPath: PERF_EXPLORER_REVEAL_TARGET_PATH,
  };
}
