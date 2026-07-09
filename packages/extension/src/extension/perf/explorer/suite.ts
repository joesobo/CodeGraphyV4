import type * as vscode from 'vscode';
import type { ExplorerObservableMetrics } from './ratios';
import { measureExplorerRevealComparison } from './reveal';
import { runExplorerMutationComparison } from './run';
import {
  explorerComparisonRuntime,
  type ExplorerComparisonRuntime,
} from './runtime';
import { createExplorerComparisonTargets } from './targets';

export interface RunExplorerComparisonSuiteInput {
  timeoutMs?: number;
  waitForRefreshIdle: () => Promise<void>;
  workspaceFolderUri: vscode.Uri;
}

export async function runExplorerComparisonSuite(
  input: RunExplorerComparisonSuiteInput,
  runtime: ExplorerComparisonRuntime = explorerComparisonRuntime,
): Promise<ExplorerObservableMetrics> {
  await runtime.showExplorer();
  await runtime.waitForWorkbenchDispatchTurn();

  const common = {
    timeoutMs: input.timeoutMs,
    waitForRefreshIdle: input.waitForRefreshIdle,
    workspaceFolderUri: input.workspaceFolderUri,
  };
  const rename = await runExplorerMutationComparison(
    { ...common, scenario: 'rename' },
    runtime,
  );
  const create = await runExplorerMutationComparison(
    { ...common, scenario: 'create' },
    runtime,
  );
  const deletion = await runExplorerMutationComparison(
    { ...common, scenario: 'delete' },
    runtime,
  );
  const revealTarget = runtime.joinPath(
    input.workspaceFolderUri,
    createExplorerComparisonTargets().revealPath,
  );
  const reveal = await measureExplorerRevealComparison(revealTarget, runtime);

  return {
    explorerRenameMs: rename.value,
    explorerCreateMs: create.value,
    explorerDeleteMs: deletion.value,
    explorerRevealMs: reveal.value,
  };
}
