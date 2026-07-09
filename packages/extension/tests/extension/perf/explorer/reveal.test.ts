import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import { measureExplorerRevealComparison } from '../../../../src/extension/perf/explorer/reveal';
import type { ExplorerComparisonRuntime } from '../../../../src/extension/perf/explorer/runtime';

describe('extension/perf/explorer/reveal', () => {
  it('measures reveal command completion plus a dispatch turn', async () => {
    const uri = { fsPath: '/fixture/src/file.ts' } as vscode.Uri;
    const revealInExplorer = vi.fn(async () => undefined);
    const waitForWorkbenchDispatchTurn = vi.fn(async () => undefined);
    const runtime = {
      now: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(27),
      revealInExplorer,
      waitForWorkbenchDispatchTurn,
    } as unknown as ExplorerComparisonRuntime;

    await expect(measureExplorerRevealComparison(uri, runtime)).resolves.toEqual({
      metric: 'explorerRevealMs',
      observation: "commands.executeCommand('revealInExplorer')",
      value: 17,
    });
    expect(revealInExplorer).toHaveBeenCalledWith(uri);
    expect(waitForWorkbenchDispatchTurn).toHaveBeenCalledOnce();
  });
});
