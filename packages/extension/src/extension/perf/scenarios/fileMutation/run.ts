import * as vscode from 'vscode';
import type { WorkspaceFileMutation } from '../../../graphView/provider/file/mutations';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { ArmedWorkspaceRefreshIdleWait } from '../../../workspaceFiles/refresh/scheduler';
import { createPerfOperation } from '../../operationId';
import type { PerfScenarioOperationRunner } from '../contracts';
import {
  createFileMutationTarget,
  type FileMutationPerfScenario,
} from './targets';
import {
  assertRestoredFileStates,
  captureFileStates,
  type FileState,
} from './snapshot';
import { assertScenarioPreconditions } from './preconditions';
import {
  fileMutationScenarioRuntime,
  type FileMutationScenarioDependencies,
} from './runtime';

export interface RunFileMutationScenarioInput {
  armRefreshIdle: () => ArmedWorkspaceRefreshIdleWait;
  dimension: string;
  ordinal: number;
  refreshGraph: () => Promise<void>;
  runId: string;
  runOperation: PerfScenarioOperationRunner;
  scenario: FileMutationPerfScenario;
  sendMessage: (message: ExtensionToWebviewMessage) => void;
  workspaceFolderUri: vscode.Uri;
}

export type { FileMutationScenarioDependencies } from './runtime';

export interface FileMutationScenarioResult {
  scenario: FileMutationPerfScenario;
  dimension: string;
  operationId: string;
  mutation: WorkspaceFileMutation;
  restored: true;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function restoreMutation(
  input: RunFileMutationScenarioInput,
  before: ReadonlyMap<string, FileState>,
  mutationCompleted: boolean,
  dependencies: FileMutationScenarioDependencies,
): Promise<void> {
  if (mutationCompleted) {
    const refreshIdle = input.armRefreshIdle();
    try {
      const description = await dependencies.undoLastMutation();
      if (!description) {
        throw new Error(
          `Performance ${input.scenario} scenario was not recorded by UndoManager`,
        );
      }
      await refreshIdle.promise;
    } finally {
      refreshIdle.dispose();
    }
  }
  await assertRestoredFileStates(
    input.scenario,
    input.workspaceFolderUri,
    before,
    dependencies.readFile,
  );
}

export async function runFileMutationScenario(
  input: RunFileMutationScenarioInput,
  dependencies: FileMutationScenarioDependencies = fileMutationScenarioRuntime,
): Promise<FileMutationScenarioResult> {
  await dependencies.focusWorkspaceEditor();
  const target = createFileMutationTarget(input.scenario, input.dimension);
  const operation = createPerfOperation({
    runId: input.runId,
    scenario: input.scenario,
    dimension: input.dimension,
    ordinal: input.ordinal,
  });
  const before = await captureFileStates(
    input.workspaceFolderUri,
    target.observedPaths,
    dependencies.readFile,
  );
  assertScenarioPreconditions(input.scenario, target.mutation, before);
  let mutationCompleted = false;
  let operationFailure: Error | undefined;

  try {
    await input.runOperation(operation, async () => {
      const refreshIdle = input.armRefreshIdle();
      try {
        await dependencies.executeMutation(target.mutation, {
          workspaceFolderUri: input.workspaceFolderUri,
          refreshGraph: input.refreshGraph,
          sendMessage: input.sendMessage,
        });
        mutationCompleted = true;
        await refreshIdle.promise;
      } finally {
        refreshIdle.dispose();
      }
    });
  } catch (error) {
    operationFailure = toError(error);
  }

  await restoreMutation(input, before, mutationCompleted, dependencies);
  if (operationFailure !== undefined) throw operationFailure;

  return {
    scenario: input.scenario,
    dimension: input.dimension,
    operationId: operation.operationId,
    mutation: target.mutation,
    restored: true,
  };
}
