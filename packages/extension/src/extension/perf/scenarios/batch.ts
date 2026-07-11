import type * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import { execGitCommand } from '../../gitHistory/exec';
import {
  armWorkspaceRefreshIdleWait,
  type ArmedWorkspaceRefreshIdleWait,
} from '../../workspaceFiles/refresh/scheduler';
import { createPerfOperation } from '../operationId';
import type { PerfScenarioOperationRunner } from './contracts';

export const PERF_BATCH_BASE_BRANCH = 'perf-base';
export const PERF_BATCH_TARGET_BRANCH = 'perf-batch-100';
const measuredBranchSequence = [
  PERF_BATCH_TARGET_BRANCH,
  PERF_BATCH_BASE_BRANCH,
  PERF_BATCH_TARGET_BRANCH,
  PERF_BATCH_BASE_BRANCH,
  PERF_BATCH_TARGET_BRANCH,
  PERF_BATCH_BASE_BRANCH,
] as const;
const workspaceRefreshTimeoutMs = 30_000;

interface BranchHead {
  kind: 'branch';
  value: string;
}

interface DetachedHead {
  kind: 'detached';
  value: string;
}

type GitHead = BranchHead | DetachedHead;

export interface RunBatchBranchScenarioInput {
  dimension: string;
  ordinal: number;
  provider: GraphViewProvider;
  runId: string;
  runOperation: PerfScenarioOperationRunner;
  workspaceFolderUri: vscode.Uri;
}

export interface BatchBranchScenarioDependencies {
  armWorkspaceRefreshIdleWait(
    provider: GraphViewProvider,
    options: { quietMs: number; timeoutMs: number },
  ): ArmedWorkspaceRefreshIdleWait;
  execGit(arguments_: string[], workspaceRoot: string): Promise<string>;
}

export interface BatchBranchScenarioResult {
  baseBranch: string;
  dimension: string;
  operationIds: string[];
  restored: true;
  scenario: 'batch-100';
  targetBranch: string;
}

const defaultDependencies: BatchBranchScenarioDependencies = {
  armWorkspaceRefreshIdleWait,
  execGit: (arguments_, workspaceRoot) => execGitCommand(arguments_, { workspaceRoot }),
};

function requireGitHeadValue(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Unable to resolve ${label} for performance batch scenario`);
  }
  return trimmed;
}

async function readGitHead(
  workspaceRoot: string,
  execGit: BatchBranchScenarioDependencies['execGit'],
): Promise<GitHead> {
  try {
    return {
      kind: 'branch',
      value: requireGitHeadValue(
        await execGit(
          ['symbolic-ref', '--quiet', '--short', 'HEAD'],
          workspaceRoot,
        ),
        'current branch',
      ),
    };
  } catch {
    return {
      kind: 'detached',
      value: requireGitHeadValue(
        await execGit(['rev-parse', 'HEAD'], workspaceRoot),
        'detached HEAD',
      ),
    };
  }
}

async function switchGitHead(
  arguments_: string[],
  input: RunBatchBranchScenarioInput,
  dependencies: BatchBranchScenarioDependencies,
): Promise<void> {
  const refreshIdle = dependencies.armWorkspaceRefreshIdleWait(
    input.provider,
    { quietMs: 32, timeoutMs: workspaceRefreshTimeoutMs },
  );
  try {
    await dependencies.execGit(arguments_, input.workspaceFolderUri.fsPath);
    await refreshIdle.promise;
  } finally {
    refreshIdle.dispose();
  }
}

async function switchToBranch(
  branch: string,
  input: RunBatchBranchScenarioInput,
  dependencies: BatchBranchScenarioDependencies,
): Promise<void> {
  await switchGitHead(
    ['switch', '--quiet', branch],
    input,
    dependencies,
  );
}

async function restoreGitHead(
  originalHead: GitHead,
  input: RunBatchBranchScenarioInput,
  dependencies: BatchBranchScenarioDependencies,
): Promise<void> {
  const currentHead = await readGitHead(
    input.workspaceFolderUri.fsPath,
    (arguments_, workspaceRoot) => dependencies.execGit(arguments_, workspaceRoot),
  );
  if (
    currentHead.kind === originalHead.kind
    && currentHead.value === originalHead.value
  ) {
    return;
  }

  const arguments_ = originalHead.kind === 'branch'
    ? ['switch', '--quiet', originalHead.value]
    : ['switch', '--quiet', '--detach', originalHead.value];
  await switchGitHead(arguments_, input, dependencies);

  const restoredHead = await readGitHead(
    input.workspaceFolderUri.fsPath,
    (arguments_, workspaceRoot) => dependencies.execGit(arguments_, workspaceRoot),
  );
  if (
    restoredHead.kind !== originalHead.kind
    || restoredHead.value !== originalHead.value
  ) {
    throw new Error(
      `Performance batch scenario did not restore ${originalHead.kind} ${originalHead.value}`,
    );
  }
}

export async function runBatchBranchScenario(
  input: RunBatchBranchScenarioInput,
  dependencies: BatchBranchScenarioDependencies = defaultDependencies,
): Promise<BatchBranchScenarioResult> {
  const operations = measuredBranchSequence.map((_branch, index) =>
    createPerfOperation({
      runId: input.runId,
      scenario: 'batch-100',
      dimension: input.dimension,
      ordinal: input.ordinal + index,
    }));
  const originalHead = await readGitHead(
    input.workspaceFolderUri.fsPath,
    (arguments_, workspaceRoot) => dependencies.execGit(arguments_, workspaceRoot),
  );

  try {
    if (
      originalHead.kind !== 'branch'
      || originalHead.value !== PERF_BATCH_BASE_BRANCH
    ) {
      await switchToBranch(PERF_BATCH_BASE_BRANCH, input, dependencies);
    }

    for (const [index, branch] of measuredBranchSequence.entries()) {
      await input.runOperation(operations[index], async () => {
        await switchToBranch(branch, input, dependencies);
      });
    }
  } finally {
    await restoreGitHead(originalHead, input, dependencies);
  }

  return {
    baseBranch: PERF_BATCH_BASE_BRANCH,
    dimension: input.dimension,
    operationIds: operations.map(operation => operation.operationId),
    restored: true,
    scenario: 'batch-100',
    targetBranch: PERF_BATCH_TARGET_BRANCH,
  };
}
