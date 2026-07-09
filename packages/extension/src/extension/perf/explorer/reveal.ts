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
 * Moves selection to a deterministic neutral row outside the timed span, then
 * times revealInExplorer command dispatch through command resolution and one
 * workbench dispatch turn. VS Code exposes no public built-in Explorer
 * selection- or paint-completion event, so this is command-completion latency.
 */
export async function measureExplorerRevealComparison(
  uri: vscode.Uri,
  neutralUri: vscode.Uri,
  runtime: ExplorerComparisonRuntime = explorerComparisonRuntime,
): Promise<ExplorerRevealMeasurement> {
  await runtime.revealInExplorer(neutralUri);
  await runtime.waitForWorkbenchDispatchTurn();
  const startedAt = runtime.now();
  await runtime.revealInExplorer(uri);
  await runtime.waitForWorkbenchDispatchTurn();
  return {
    metric: 'explorerRevealMs',
    observation: "commands.executeCommand('revealInExplorer')",
    value: Math.max(0, runtime.now() - startedAt),
  };
}
