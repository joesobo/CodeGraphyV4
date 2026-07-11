import type * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import type { PerfScenario } from '../../../shared/perf/protocol';
import { runBatchBranchScenario } from './batch';
import type { PerfScenarioOperationRunner } from './contracts';
import { runFileMutationScenario } from './fileMutation/run';
import {
  createFileMutationRefreshIdleWaiter,
} from './fileMutation/runtime';
import { runDocumentSaveScenario } from './save';
import { runExplorerScenarioComparison } from '../explorer/scenario';
import { createFileMutationTarget } from './fileMutation/targets';
import { workspaceFileMutationPaths } from '../../graphView/provider/file/mutations';

export type NonOpenPerfScenario = Exclude<
  PerfScenario,
  'cold-open' | 'warm-open'
>;

export type DeferredPerfScenario =
  | 'interaction-burst'
  | 'scope-toggle'
  | 'idle-watch';

export interface RunNonOpenPerfScenarioInput {
  dimension: string;
  provider: GraphViewProvider;
  runId: string;
  scenario: NonOpenPerfScenario;
  workspaceFolderUri: vscode.Uri;
}

export interface DeferredPerfScenarioInput<
  Scenario extends DeferredPerfScenario = DeferredPerfScenario,
> extends RunNonOpenPerfScenarioInput {
  ordinal: 0;
  runOperation: PerfScenarioOperationRunner;
  scenario: Scenario;
}

export type DeferredPerfScenarioRunner<
  Scenario extends DeferredPerfScenario,
> = (input: DeferredPerfScenarioInput<Scenario>) => Promise<unknown>;

export interface NonOpenPerfScenarioDependencies {
  runBatchBranchScenario: typeof runBatchBranchScenario;
  runDocumentSaveScenario: typeof runDocumentSaveScenario;
  runExplorerScenarioComparison: typeof runExplorerScenarioComparison;
  runFileMutationScenario: typeof runFileMutationScenario;
  runIdleWatchScenario?: DeferredPerfScenarioRunner<'idle-watch'>;
  runInteractionBurstScenario?: DeferredPerfScenarioRunner<'interaction-burst'>;
  runScopeToggleScenario?: DeferredPerfScenarioRunner<'scope-toggle'>;
}

const defaultDependencies: NonOpenPerfScenarioDependencies = {
  runBatchBranchScenario,
  runDocumentSaveScenario,
  runExplorerScenarioComparison,
  runFileMutationScenario,
};

function runDeferredScenario<Scenario extends DeferredPerfScenario>(
  input: RunNonOpenPerfScenarioInput,
  scenario: Scenario,
  runOperation: PerfScenarioOperationRunner,
  runner: DeferredPerfScenarioRunner<Scenario> | undefined,
): Promise<unknown> {
  if (!runner) {
    throw new Error(`Unsupported performance scenario: ${scenario}`);
  }

  return runner({
    ...input,
    ordinal: 0,
    runOperation,
    scenario,
  });
}

export async function runNonOpenPerfScenario(
  input: RunNonOpenPerfScenarioInput,
  runOperation: PerfScenarioOperationRunner,
  dependencyOverrides: Partial<NonOpenPerfScenarioDependencies> = {},
): Promise<unknown> {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  switch (input.scenario) {
    case 'single-save':
      return dependencies.runDocumentSaveScenario({
        dimension: input.dimension,
        ordinal: 0,
        provider: input.provider,
        runId: input.runId,
        runOperation,
        workspaceFolderUri: input.workspaceFolderUri,
      });
    case 'rename':
    case 'create':
    case 'delete': {
      const fileMutationScenario = input.scenario;
      const waitForRefreshIdle = createFileMutationRefreshIdleWaiter(input.provider);
      const mutation = await dependencies.runFileMutationScenario({
        dimension: input.dimension,
        ordinal: 0,
        refreshGraph: () => input.provider.refreshChangedFiles(
          workspaceFileMutationPaths(
            createFileMutationTarget(fileMutationScenario, input.dimension).mutation,
          ),
        ),
        runId: input.runId,
        runOperation,
        scenario: input.scenario,
        sendMessage: message => input.provider.sendToWebview(message),
        workspaceFolderUri: input.workspaceFolderUri,
      });
      const comparison = await dependencies.runExplorerScenarioComparison({
        dimension: input.dimension,
        provider: input.provider,
        scenario: input.scenario,
        waitForRefreshIdle,
        workspaceFolderUri: input.workspaceFolderUri,
      });
      return { ...mutation, comparison };
    }
    case 'batch-100':
      return dependencies.runBatchBranchScenario({
        dimension: input.dimension,
        ordinal: 0,
        provider: input.provider,
        runId: input.runId,
        runOperation,
        workspaceFolderUri: input.workspaceFolderUri,
      });
    case 'interaction-burst':
      return runDeferredScenario(
        input,
        input.scenario,
        runOperation,
        dependencies.runInteractionBurstScenario,
      );
    case 'scope-toggle':
      return runDeferredScenario(
        input,
        input.scenario,
        runOperation,
        dependencies.runScopeToggleScenario,
      );
    case 'idle-watch':
      return runDeferredScenario(
        input,
        input.scenario,
        runOperation,
        dependencies.runIdleWatchScenario,
      );
    default:
      throw new Error(`Unsupported performance scenario: ${String(input.scenario)}`);
  }
}
