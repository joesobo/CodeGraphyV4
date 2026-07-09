import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import { measureExplorerRevealComparison } from '../../../../src/extension/perf/explorer/reveal';
import type { ExplorerComparisonRuntime } from '../../../../src/extension/perf/explorer/runtime';

describe('extension/perf/explorer/reveal', () => {
  it('neutralizes selection before starting the target reveal measurement', async () => {
    const order: string[] = [];
    const uri = { fsPath: '/fixture/src/target.ts' } as vscode.Uri;
    const neutralUri = { fsPath: '/fixture/src/neutral.ts' } as vscode.Uri;
    let nowCall = 0;
    const revealInExplorer = vi.fn(async (nextUri: vscode.Uri) => {
      order.push(`reveal:${nextUri.fsPath}`);
    });
    const waitForWorkbenchDispatchTurn = vi.fn(async () => {
      order.push('dispatch');
    });
    const runtime = {
      now: vi.fn(() => {
        const started = nowCall === 0;
        nowCall += 1;
        order.push(started ? 'start' : 'stop');
        return started ? 10 : 27;
      }),
      revealInExplorer,
      waitForWorkbenchDispatchTurn,
    } as unknown as ExplorerComparisonRuntime;

    await expect(measureExplorerRevealComparison(uri, neutralUri, runtime)).resolves.toEqual({
      metric: 'explorerRevealMs',
      observation: "commands.executeCommand('revealInExplorer')",
      value: 17,
    });
    expect(order).toEqual([
      'reveal:/fixture/src/neutral.ts',
      'dispatch',
      'start',
      'reveal:/fixture/src/target.ts',
      'dispatch',
      'stop',
    ]);
  });
});
