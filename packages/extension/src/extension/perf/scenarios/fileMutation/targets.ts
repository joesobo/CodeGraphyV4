import type { WorkspaceFileMutation } from '../../../graphView/provider/file/mutations';
import { createPerfFixtureTargets } from '../../fixtures/targets';

export type FileMutationPerfScenario = 'rename' | 'create' | 'delete';

export interface FileMutationTarget {
  scenario: FileMutationPerfScenario;
  mutation: WorkspaceFileMutation;
  observedPaths: string[];
}

export function createFileMutationTarget(
  scenario: FileMutationPerfScenario,
  dimension = 'small',
): FileMutationTarget {
  const targets = createPerfFixtureTargets(dimension);
  switch (scenario) {
    case 'rename':
      return {
        scenario,
        mutation: {
          kind: 'rename',
          oldPath: targets.renameSourcePath,
          newPath: targets.renameTargetPath,
        },
        observedPaths: [targets.renameSourcePath, targets.renameTargetPath],
      };
    case 'create':
      return {
        scenario,
        mutation: { kind: 'create', filePath: targets.createPath },
        observedPaths: [targets.createPath],
      };
    case 'delete':
      return {
        scenario,
        mutation: { kind: 'delete', paths: [targets.deletePath] },
        observedPaths: [targets.deletePath],
      };
  }
}
