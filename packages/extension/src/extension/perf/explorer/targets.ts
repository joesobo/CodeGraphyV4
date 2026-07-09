import {
  createFileMutationTarget,
  type FileMutationTarget,
} from '../scenarios/fileMutation/targets';
import { createPerfFixtureTargets } from '../fixtures/targets';

const generatedTargets = createPerfFixtureTargets('small');
export const PERF_EXPLORER_REVEAL_TARGET_PATH = generatedTargets.revealPath;
export const PERF_EXPLORER_NEUTRAL_TARGET_PATH = generatedTargets.neutralPath;

export interface ExplorerComparisonTargets {
  rename: FileMutationTarget;
  create: FileMutationTarget;
  delete: FileMutationTarget;
  neutralPath: string;
  revealPath: string;
}

export function createExplorerComparisonTargets(
  dimension = 'small',
): ExplorerComparisonTargets {
  const targets = createPerfFixtureTargets(dimension);
  return {
    rename: createFileMutationTarget('rename', dimension),
    create: createFileMutationTarget('create', dimension),
    delete: createFileMutationTarget('delete', dimension),
    neutralPath: targets.neutralPath,
    revealPath: targets.revealPath,
  };
}
