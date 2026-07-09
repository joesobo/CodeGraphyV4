import type * as vscode from 'vscode';
import { createExplorerMutationAdapter } from './adapter';
import { measureExplorerWorkspaceEventLatency } from './measurement';
import { restoreExplorerMutation } from './restore';
import {
  explorerComparisonRuntime,
  type ExplorerComparisonRuntime,
} from './runtime';
import { createExplorerComparisonTargets } from './targets';
import { assertScenarioPreconditions } from '../scenarios/fileMutation/preconditions';
import {
  assertRestoredFileStates,
  captureFileStates,
  type FileState,
} from '../scenarios/fileMutation/snapshot';
import type { FileMutationPerfScenario } from '../scenarios/fileMutation/targets';

export interface RunExplorerMutationComparisonInput {
  scenario: FileMutationPerfScenario;
  timeoutMs?: number;
  waitForRefreshIdle: () => Promise<void>;
  workspaceFolderUri: vscode.Uri;
}

export interface ExplorerMutationMeasurement {
  metric: 'explorerRenameMs' | 'explorerCreateMs' | 'explorerDeleteMs';
  observation:
    | 'workspace.onDidRenameFiles'
    | 'workspace.onDidCreateFiles'
    | 'workspace.onDidDeleteFiles';
  value: number;
}

const measurementDetails = {
  rename: {
    metric: 'explorerRenameMs',
    observation: 'workspace.onDidRenameFiles',
  },
  create: {
    metric: 'explorerCreateMs',
    observation: 'workspace.onDidCreateFiles',
  },
  delete: {
    metric: 'explorerDeleteMs',
    observation: 'workspace.onDidDeleteFiles',
  },
} as const;

async function restoreAndDrain(
  input: RunExplorerMutationComparisonInput,
  before: ReadonlyMap<string, FileState>,
  runtime: ExplorerComparisonRuntime,
): Promise<void> {
  const target = createExplorerComparisonTargets()[input.scenario];
  try {
    await input.waitForRefreshIdle();
  } finally {
    try {
      await restoreExplorerMutation(target, input.workspaceFolderUri, before, runtime);
    } finally {
      await input.waitForRefreshIdle();
    }
  }
}

export async function runExplorerMutationComparison(
  input: RunExplorerMutationComparisonInput,
  runtime: ExplorerComparisonRuntime = explorerComparisonRuntime,
): Promise<ExplorerMutationMeasurement> {
  const target = createExplorerComparisonTargets()[input.scenario];
  const before = await captureFileStates(
    input.workspaceFolderUri,
    target.observedPaths,
    runtime.readFile,
  );
  assertScenarioPreconditions(input.scenario, target.mutation, before);
  const adapter = createExplorerMutationAdapter(
    target,
    input.workspaceFolderUri,
    runtime,
  );
  let applied: boolean | undefined;
  let value: number;

  try {
    value = await measureExplorerWorkspaceEventLatency({
      label: adapter.label,
      subscribe: adapter.subscribe,
      matches: adapter.matches,
      apply: async () => {
        applied = await adapter.apply();
        return applied;
      },
      timeoutMs: input.timeoutMs,
    }, runtime);
  } finally {
    if (applied) {
      await restoreAndDrain(input, before, runtime);
    } else {
      await assertRestoredFileStates(
        input.scenario,
        input.workspaceFolderUri,
        before,
        runtime.readFile,
      );
    }
  }

  return { ...measurementDetails[input.scenario], value };
}
