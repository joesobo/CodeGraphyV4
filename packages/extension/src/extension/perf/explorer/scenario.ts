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

  const codeGraphyRevealMs = input.scenario === 'rename'
      ? await dependencies.measureCodeGraphyRevealComparison(
        input.provider,
        targets.revealPath,
        neutralUri,
        runtime,
      )
    : undefined;
  const mutation = await dependencies.runExplorerMutationComparison({
    dimension: input.dimension,
    scenario: input.scenario,
    timeoutMs: input.timeoutMs,
    waitForRefreshIdle: input.waitForRefreshIdle,
    workspaceFolderUri: input.workspaceFolderUri,
  }, runtime);

  if (input.scenario === 'rename') {
    const revealUri = runtime.joinPath(
      input.workspaceFolderUri,
      targets.revealPath,
    );
    const reveal = await dependencies.measureExplorerRevealComparison(
      revealUri,
      neutralUri,
      runtime,
    );
    return parsePerfScenarioComparison(input.scenario, {
      codeGraphyRevealMs,
      explorer: {
        explorerRenameMs: mutation.value,
        explorerRevealMs: reveal.value,
      },
    });
  }

  const metricName = input.scenario === 'create'
    ? 'explorerCreateMs'
    : 'explorerDeleteMs';
  return parsePerfScenarioComparison(input.scenario, {
    explorer: { [metricName]: mutation.value },
  });
}
