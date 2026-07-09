import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import { measureCodeGraphyRevealComparison } from '../../../../src/extension/perf/explorer/codeGraphyReveal';
import type { ExplorerComparisonRuntime } from '../../../../src/extension/perf/explorer/runtime';

describe('extension/perf/explorer/codeGraphyReveal', () => {
  it('neutralizes selection before starting the production reveal measurement', async () => {
    const order: string[] = [];
    const neutralUri = { fsPath: '/fixture/src/neutral.ts' } as vscode.Uri;
    let nowCall = 0;
    const provider = {
      dispatchWebviewMessage: vi.fn(async () => { order.push('codegraphy-reveal'); }),
    };
    const runtime = {
      now: vi.fn(() => {
        const started = nowCall === 0;
        nowCall += 1;
        order.push(started ? 'start' : 'stop');
        return started ? 10 : 29;
      }),
      revealInExplorer: vi.fn(async (uri: vscode.Uri) => {
        order.push(`reveal:${uri.fsPath}`);
      }),
      waitForWorkbenchDispatchTurn: vi.fn(async () => { order.push('dispatch'); }),
    } as unknown as ExplorerComparisonRuntime;

    await expect(measureCodeGraphyRevealComparison(
      provider,
      'perf/fixtures/paths.ts',
      neutralUri,
      runtime,
    ))
      .resolves.toBe(19);

    expect(provider.dispatchWebviewMessage).toHaveBeenCalledWith({
      type: 'REVEAL_IN_EXPLORER',
      payload: { path: 'perf/fixtures/paths.ts' },
    });
    expect(order).toEqual([
      'reveal:/fixture/src/neutral.ts',
      'dispatch',
      'start',
      'codegraphy-reveal',
      'dispatch',
      'stop',
    ]);
  });
});
