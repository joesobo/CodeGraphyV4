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
  provider: Pick<GraphViewProvider, 'dispatchWebviewMessage' | 'isGraphOpen'>;
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

function assertGraphRemainsOpen(
  provider: Pick<GraphViewProvider, 'isGraphOpen'>,
): void {
  if (!provider.isGraphOpen()) {
    throw new Error('Explorer comparison requires the CodeGraphy graph to remain open');
  }
}

export async function runExplorerScenarioComparison(
  input: RunExplorerScenarioComparisonInput,
  dependencies: ExplorerScenarioComparisonDependencies = defaultDependencies,
): Promise<PerfScenarioComparison> {
  const runtime = dependencies.runtime;
  await runtime.showExplorer();
  await runtime.waitForWorkbenchDispatchTurn();
  assertGraphRemainsOpen(input.provider);
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
      async () => {
        assertGraphRemainsOpen(input.provider);
        const measurement = await dependencies.measureCodeGraphyRevealComparison(
          input.provider,
          targets.revealPath,
          neutralUri,
          runtime,
        );
        assertGraphRemainsOpen(input.provider);
        return measurement;
      },
      async () => {
        assertGraphRemainsOpen(input.provider);
        const measurement = await dependencies.measureExplorerRevealComparison(
          revealUri,
          neutralUri,
          runtime,
        );
        assertGraphRemainsOpen(input.provider);
        return measurement.value;
      },
    )
    : undefined;
  const mutationMs = await sampleExplorerComparisonMedian(
    async () => {
      await runtime.revealInExplorer(neutralUri);
      await runtime.waitForWorkbenchDispatchTurn();
      assertGraphRemainsOpen(input.provider);
      const measurement = await dependencies.runExplorerMutationComparison({
        dimension: input.dimension,
        scenario: input.scenario,
        timeoutMs: input.timeoutMs,
        waitForRefreshIdle: input.waitForRefreshIdle,
        workspaceFolderUri: input.workspaceFolderUri,
      }, runtime);
      assertGraphRemainsOpen(input.provider);
      return measurement.value;
    },
    () => runtime.waitForComparisonQuietWindow
      ? runtime.waitForComparisonQuietWindow()
      : runtime.waitForWorkbenchDispatchTurn(),
  );

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
