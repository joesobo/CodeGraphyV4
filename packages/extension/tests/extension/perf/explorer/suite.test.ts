import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import { runExplorerMutationComparison } from '../../../../src/extension/perf/explorer/run';
import { measureExplorerRevealComparison } from '../../../../src/extension/perf/explorer/reveal';
import { runExplorerComparisonSuite } from '../../../../src/extension/perf/explorer/suite';
import type { ExplorerComparisonRuntime } from '../../../../src/extension/perf/explorer/runtime';

vi.mock('../../../../src/extension/perf/explorer/run', () => ({
  runExplorerMutationComparison: vi.fn(),
}));

vi.mock('../../../../src/extension/perf/explorer/reveal', () => ({
  measureExplorerRevealComparison: vi.fn(),
}));

describe('extension/perf/explorer/suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runExplorerMutationComparison)
      .mockResolvedValueOnce({
        metric: 'explorerRenameMs',
        observation: 'workspace.onDidRenameFiles',
        value: 11,
      })
      .mockResolvedValueOnce({
        metric: 'explorerCreateMs',
        observation: 'workspace.onDidCreateFiles',
        value: 12,
      })
      .mockResolvedValueOnce({
        metric: 'explorerDeleteMs',
        observation: 'workspace.onDidDeleteFiles',
        value: 13,
      });
    vi.mocked(measureExplorerRevealComparison).mockResolvedValue({
      metric: 'explorerRevealMs',
      observation: "commands.executeCommand('revealInExplorer')",
      value: 14,
    });
  });

  it('shows the same-window Explorer before measuring all comparable operations', async () => {
    const workspaceFolderUri = { fsPath: '/fixture' } as vscode.Uri;
    const order: string[] = [];
    const runtime = {
      showExplorer: vi.fn(async () => { order.push('show'); }),
      waitForWorkbenchDispatchTurn: vi.fn(async () => { order.push('dispatch'); }),
      joinPath: vi.fn((_workspace: vscode.Uri, path: string) => ({
        fsPath: `/fixture/${path}`,
      }) as vscode.Uri),
    } as unknown as ExplorerComparisonRuntime;
    vi.mocked(runExplorerMutationComparison).mockReset().mockImplementation(async (input) => {
      order.push(input.scenario);
      const values = { rename: 11, create: 12, delete: 13 } as const;
      const metrics = {
        rename: 'explorerRenameMs',
        create: 'explorerCreateMs',
        delete: 'explorerDeleteMs',
      } as const;
      const observations = {
        rename: 'workspace.onDidRenameFiles',
        create: 'workspace.onDidCreateFiles',
        delete: 'workspace.onDidDeleteFiles',
      } as const;
      return {
        metric: metrics[input.scenario],
        observation: observations[input.scenario],
        value: values[input.scenario],
      };
    });
    vi.mocked(measureExplorerRevealComparison).mockImplementation(async () => {
      order.push('reveal');
      return {
        metric: 'explorerRevealMs',
        observation: "commands.executeCommand('revealInExplorer')",
        value: 14,
      };
    });

    const metrics = await runExplorerComparisonSuite({
      waitForRefreshIdle: vi.fn(async () => undefined),
      workspaceFolderUri,
    }, runtime);

    expect(order).toEqual(['show', 'dispatch', 'rename', 'create', 'delete', 'reveal']);
    expect(metrics).toEqual({
      explorerRenameMs: 11,
      explorerCreateMs: 12,
      explorerDeleteMs: 13,
      explorerRevealMs: 14,
    });
    expect(runExplorerMutationComparison).toHaveBeenNthCalledWith(1, {
      scenario: 'rename',
      timeoutMs: undefined,
      waitForRefreshIdle: expect.any(Function),
      workspaceFolderUri,
    }, runtime);
  });
});
