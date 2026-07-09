import type * as vscode from 'vscode';
import type { GraphViewProvider } from '../../graphViewProvider';
import {
  explorerComparisonRuntime,
  type ExplorerComparisonRuntime,
} from './runtime';

type RevealDispatchProvider = Pick<GraphViewProvider, 'dispatchWebviewMessage'>;

/**
 * Moves selection to a deterministic neutral row outside the timed span, then
 * times the real REVEAL_IN_EXPLORER provider dispatch through command
 * completion and one workbench dispatch turn. VS Code has no public built-in
 * Explorer paint-completion signal, so this matches the Explorer reveal span.
 */
export async function measureCodeGraphyRevealComparison(
  provider: RevealDispatchProvider,
  targetPath: string,
  neutralUri: vscode.Uri,
  runtime: ExplorerComparisonRuntime = explorerComparisonRuntime,
): Promise<number> {
  await runtime.revealInExplorer(neutralUri);
  await runtime.waitForWorkbenchDispatchTurn();
  const startedAt = runtime.now();
  await provider.dispatchWebviewMessage({
    type: 'REVEAL_IN_EXPLORER',
    payload: { path: targetPath },
  });
  await runtime.waitForWorkbenchDispatchTurn();
  return Math.max(0, runtime.now() - startedAt);
}
