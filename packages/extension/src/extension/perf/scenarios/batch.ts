import type * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import { execGitCommand } from '../../gitHistory/exec';
import { waitForWorkspaceRefreshIdle } from '../../workspaceFiles/refresh/scheduler';
import { createPerfOperation } from '../operationId';
import type { PerfScenarioOperationRunner } from './contracts';

export const PERF_BATCH_BASE_BRANCH = 'perf-base';
export const PERF_BATCH_TARGET_BRANCH = 'perf-batch-100';

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
  execGit(arguments_: string[], workspaceRoot: string): Promise<string>;
  waitForWorkspaceRefreshIdle(
    provider: GraphViewProvider,
    options: { quietMs: number },
  ): Promise<void>;
}

export interface BatchBranchScenarioResult {
  baseBranch: string;
  dimension: string;
  operationId: string;
  restored: true;
  scenario: 'batch-100';
  targetBranch: string;
}

const defaultDependencies: BatchBranchScenarioDependencies = {
  execGit: (arguments_, workspaceRoot) => execGitCommand(arguments_, { workspaceRoot }),
  waitForWorkspaceRefreshIdle,
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

async function waitForRefresh(
  input: RunBatchBranchScenarioInput,
  dependencies: BatchBranchScenarioDependencies,
): Promise<void> {
  await dependencies.waitForWorkspaceRefreshIdle(
    input.provider,
    { quietMs: 32 },
  );
}

async function switchToBranch(
  branch: string,
  input: RunBatchBranchScenarioInput,
  dependencies: BatchBranchScenarioDependencies,
): Promise<void> {
  await dependencies.execGit(
    ['switch', '--quiet', branch],
    input.workspaceFolderUri.fsPath,
  );
  await waitForRefresh(input, dependencies);
}

async function restoreGitHead(
  originalHead: GitHead,
  input: RunBatchBranchScenarioInput,
  dependencies: BatchBranchScenarioDependencies,
): Promise<void> {
  const arguments_ = originalHead.kind === 'branch'
    ? ['switch', '--quiet', originalHead.value]
    : ['switch', '--quiet', '--detach', originalHead.value];
  await dependencies.execGit(arguments_, input.workspaceFolderUri.fsPath);
  await waitForRefresh(input, dependencies);

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
  const operation = createPerfOperation({
    runId: input.runId,
    scenario: 'batch-100',
    dimension: input.dimension,
    ordinal: input.ordinal,
  });
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

    await input.runOperation(operation, async () => {
      await switchToBranch(PERF_BATCH_TARGET_BRANCH, input, dependencies);
    });
  } finally {
    await restoreGitHead(originalHead, input, dependencies);
  }

  return {
    baseBranch: PERF_BATCH_BASE_BRANCH,
    dimension: input.dimension,
    operationId: operation.operationId,
    restored: true,
    scenario: 'batch-100',
    targetBranch: PERF_BATCH_TARGET_BRANCH,
  };
}
