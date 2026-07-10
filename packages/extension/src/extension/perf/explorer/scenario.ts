import type * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import { measureCodeGraphyRevealComparison } from './codeGraphyReveal';
import {
  parsePerfScenarioComparison,
  type PerfScenarioComparison,
} from './comparison';
import { measureExplorerRevealComparison } from './reveal';
import { runExplorerMutationComparison } from './run';
import {
  sampleExplorerComparisonMedian,
  sampleExplorerRevealComparisonMedians,
} from './sampling';
import {
  explorerComparisonRuntime,
  type ExplorerComparisonRuntime,
} from './runtime';
import {
  createExplorerComparisonTargets,
} from './targets';

export type ExplorerComparableScenario = 'rename' | 'create' | 'delete';

export interface RunExplorerScenarioComparisonInput {
  dimension: string;
  provider: Pick<GraphViewProvider, 'dispatchWebviewMessage'>;
  scenario: ExplorerComparableScenario;
  timeoutMs?: number;
  waitForRefreshIdle: () => Promise<void>;
  workspaceFolderUri: vscode.Uri;
}

export interface ExplorerScenarioComparisonDependencies {
  measureCodeGraphyRevealComparison: typeof measureCodeGraphyRevealComparison;
  measureExplorerRevealComparison: typeof measureExplorerRevealComparison;
  runExplorerMutationComparison: typeof runExplorerMutationComparison;
  runtime: ExplorerComparisonRuntime;
}

const defaultDependencies: ExplorerScenarioComparisonDependencies = {
  measureCodeGraphyRevealComparison,
  measureExplorerRevealComparison,
  runExplorerMutationComparison,
  runtime: explorerComparisonRuntime,
};

export async function runExplorerScenarioComparison(
  input: RunExplorerScenarioComparisonInput,
  dependencies: ExplorerScenarioComparisonDependencies = defaultDependencies,
): Promise<PerfScenarioComparison> {
  const runtime = dependencies.runtime;
  await runtime.showExplorer();
  await runtime.waitForWorkbenchDispatchTurn();
  const targets = createExplorerComparisonTargets(input.dimension);
  const neutralUri = runtime.joinPath(
    input.workspaceFolderUri,
    targets.neutralPath,
  );

  const revealUri = runtime.joinPath(
    input.workspaceFolderUri,
    targets.revealPath,
  );
  const revealComparison = input.scenario === 'rename'
    ? await sampleExplorerRevealComparisonMedians(
      () => dependencies.measureCodeGraphyRevealComparison(
        input.provider,
        targets.revealPath,
        neutralUri,
        runtime,
      ),
      async () => {
        const measurement = await dependencies.measureExplorerRevealComparison(
          revealUri,
          neutralUri,
          runtime,
        );
        return measurement.value;
      },
    )
    : undefined;
  const mutationMs = await sampleExplorerComparisonMedian(async () => {
    await runtime.revealInExplorer(neutralUri);
    await runtime.waitForWorkbenchDispatchTurn();
    const measurement = await dependencies.runExplorerMutationComparison({
      dimension: input.dimension,
      scenario: input.scenario,
      timeoutMs: input.timeoutMs,
      waitForRefreshIdle: input.waitForRefreshIdle,
      workspaceFolderUri: input.workspaceFolderUri,
    }, runtime);
    return measurement.value;
  });

  if (input.scenario === 'rename') {
    if (!revealComparison) {
      throw new Error('Rename comparison requires paired reveal measurements');
    }
    return parsePerfScenarioComparison(input.scenario, {
      codeGraphyRevealMs: revealComparison.codeGraphyRevealMs,
      explorer: {
        explorerRenameMs: mutationMs,
        explorerRevealMs: revealComparison.explorerRevealMs,
      },
    });
  }

  const metricName = input.scenario === 'create'
    ? 'explorerCreateMs'
    : 'explorerDeleteMs';
  return parsePerfScenarioComparison(input.scenario, {
    explorer: { [metricName]: mutationMs },
  });
}
