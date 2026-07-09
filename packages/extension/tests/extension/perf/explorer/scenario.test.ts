import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import {
  runExplorerScenarioComparison,
  type ExplorerScenarioComparisonDependencies,
} from '../../../../src/extension/perf/explorer/scenario';

const workspaceFolderUri = { fsPath: '/fixture' } as vscode.Uri;

function setupDependencies() {
  const order: string[] = [];
  const dependencies = {
    measureCodeGraphyRevealComparison: vi.fn(async () => {
      order.push('codegraphy-reveal');
      return 7;
    }),
    measureExplorerRevealComparison: vi.fn(async () => {
      order.push('explorer-reveal');
      return {
        metric: 'explorerRevealMs' as const,
        observation: "commands.executeCommand('revealInExplorer')" as const,
        value: 5,
      };
    }),
    runExplorerMutationComparison: vi.fn(async (input: { scenario: string }) => {
      order.push(`explorer-${input.scenario}`);
      const byScenario = {
        rename: {
          metric: 'explorerRenameMs' as const,
          observation: 'workspace.onDidRenameFiles' as const,
          value: 11,
        },
        create: {
          metric: 'explorerCreateMs' as const,
          observation: 'workspace.onDidCreateFiles' as const,
          value: 12,
        },
        delete: {
          metric: 'explorerDeleteMs' as const,
          observation: 'workspace.onDidDeleteFiles' as const,
          value: 13,
        },
      };
      return byScenario[input.scenario as keyof typeof byScenario];
    }),
    runtime: {
      joinPath: vi.fn((_workspace: vscode.Uri, path: string) => ({
        fsPath: `/fixture/${path}`,
      }) as vscode.Uri),
      showExplorer: vi.fn(async () => { order.push('show-explorer'); }),
      waitForWorkbenchDispatchTurn: vi.fn(async () => { order.push('dispatch-turn'); }),
    },
  } as unknown as ExplorerScenarioComparisonDependencies;
  return { dependencies, order };
}

describe('extension/perf/explorer/scenario', () => {
  it('returns same-session rename and reveal comparisons', async () => {
    const { dependencies, order } = setupDependencies();
    const waitForRefreshIdle = vi.fn(async () => undefined);
    const provider = { dispatchWebviewMessage: vi.fn() };

    await expect(runExplorerScenarioComparison({
      dimension: 'small',
      provider: provider as never,
      scenario: 'rename',
      waitForRefreshIdle,
      workspaceFolderUri,
    }, dependencies)).resolves.toEqual({
      codeGraphyRevealMs: 7,
      explorer: { explorerRenameMs: 11, explorerRevealMs: 5 },
    });

    expect(order).toEqual([
      'show-explorer',
      'dispatch-turn',
      'codegraphy-reveal',
      'explorer-rename',
      'explorer-reveal',
    ]);
    expect(dependencies.measureCodeGraphyRevealComparison).toHaveBeenCalledWith(
      provider,
      'src/group-00000/file-000000.ts',
      { fsPath: '/fixture/src/group-00000/file-000001.ts' },
      dependencies.runtime,
    );
    expect(dependencies.measureExplorerRevealComparison).toHaveBeenCalledWith(
      { fsPath: '/fixture/src/group-00000/file-000000.ts' },
      { fsPath: '/fixture/src/group-00000/file-000001.ts' },
      dependencies.runtime,
    );
    expect(dependencies.runExplorerMutationComparison).toHaveBeenCalledWith({
      dimension: 'small',
      scenario: 'rename',
      timeoutMs: undefined,
      waitForRefreshIdle,
      workspaceFolderUri,
    }, dependencies.runtime);
  });

  it('returns the same-session create comparison', async () => {
    const { dependencies, order } = setupDependencies();

    await expect(runExplorerScenarioComparison({
      dimension: 'small',
      provider: {} as never,
      scenario: 'create',
      waitForRefreshIdle: vi.fn(async () => undefined),
      workspaceFolderUri,
    }, dependencies)).resolves.toEqual({
      explorer: { explorerCreateMs: 12 },
    });
    expect(order).toEqual([
      'show-explorer',
      'dispatch-turn',
      'explorer-create',
    ]);
  });

  it('returns the same-session delete comparison', async () => {
    const { dependencies, order } = setupDependencies();

    await expect(runExplorerScenarioComparison({
      dimension: 'small',
      provider: {} as never,
      scenario: 'delete',
      waitForRefreshIdle: vi.fn(async () => undefined),
      workspaceFolderUri,
    }, dependencies)).resolves.toEqual({
      explorer: { explorerDeleteMs: 13 },
    });
    expect(order).toEqual([
      'show-explorer',
      'dispatch-turn',
      'explorer-delete',
    ]);
  });

  it('awaits Explorer visibility completion before starting comparisons', async () => {
    const { dependencies } = setupDependencies();
    let finishShow: (() => void) | undefined;
    let finishDispatch: (() => void) | undefined;
    vi.mocked(dependencies.runtime.showExplorer).mockImplementation(() =>
      new Promise<void>((resolve) => { finishShow = resolve; }));
    vi.mocked(dependencies.runtime.waitForWorkbenchDispatchTurn).mockImplementation(() =>
      new Promise<void>((resolve) => { finishDispatch = resolve; }));

    const pending = runExplorerScenarioComparison({
      dimension: 'small',
      provider: {} as never,
      scenario: 'create',
      waitForRefreshIdle: vi.fn(async () => undefined),
      workspaceFolderUri,
    }, dependencies);
    await Promise.resolve();

    expect(dependencies.runExplorerMutationComparison).not.toHaveBeenCalled();
    finishShow?.();
    await Promise.resolve();

    expect(dependencies.runtime.waitForWorkbenchDispatchTurn).toHaveBeenCalledOnce();
    expect(dependencies.runExplorerMutationComparison).not.toHaveBeenCalled();
    finishDispatch?.();
    await pending;

    expect(dependencies.runExplorerMutationComparison).toHaveBeenCalledOnce();
  });

  it('passes self mutation and reveal targets through the same session', async () => {
    const { dependencies } = setupDependencies();
    const provider = { dispatchWebviewMessage: vi.fn() };

    await runExplorerScenarioComparison({
      dimension: 'self',
      provider: provider as never,
      scenario: 'rename',
      waitForRefreshIdle: vi.fn(async () => undefined),
      workspaceFolderUri,
    }, dependencies);

    expect(dependencies.measureCodeGraphyRevealComparison).toHaveBeenCalledWith(
      provider,
      'perf/fixtures/paths.ts',
      { fsPath: '/fixture/perf/fixtures/generate.ts' },
      dependencies.runtime,
    );
    expect(dependencies.measureExplorerRevealComparison).toHaveBeenCalledWith(
      { fsPath: '/fixture/perf/fixtures/paths.ts' },
      { fsPath: '/fixture/perf/fixtures/generate.ts' },
      dependencies.runtime,
    );
    expect(dependencies.runExplorerMutationComparison).toHaveBeenCalledWith(
      expect.objectContaining({ dimension: 'self', scenario: 'rename' }),
      dependencies.runtime,
    );
  });
});
