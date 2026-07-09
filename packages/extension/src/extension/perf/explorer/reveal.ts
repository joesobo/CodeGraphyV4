import type * as vscode from 'vscode';
import {
  explorerComparisonRuntime,
  type ExplorerComparisonRuntime,
} from './runtime';

export interface ExplorerRevealMeasurement {
  metric: 'explorerRevealMs';
  observation: "commands.executeCommand('revealInExplorer')";
  value: number;
}

/**
 * Times revealInExplorer command dispatch through command resolution and one
 * workbench dispatch turn. VS Code exposes no public built-in Explorer
 * selection or paint-complete event, so this is command-completion latency.
 */
export async function measureExplorerRevealComparison(
  uri: vscode.Uri,
  runtime: ExplorerComparisonRuntime = explorerComparisonRuntime,
): Promise<ExplorerRevealMeasurement> {
  const startedAt = runtime.now();
  await runtime.revealInExplorer(uri);
  await runtime.waitForWorkbenchDispatchTurn();
  return {
    metric: 'explorerRevealMs',
    observation: "commands.executeCommand('revealInExplorer')",
    value: Math.max(0, runtime.now() - startedAt),
  };
}
