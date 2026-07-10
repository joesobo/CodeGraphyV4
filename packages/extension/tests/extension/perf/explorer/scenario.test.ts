import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import {
  runExplorerScenarioComparison,
  type ExplorerScenarioComparisonDependencies,
} from '../../../../src/extension/perf/explorer/scenario';

const workspaceFolderUri = { fsPath: '/fixture' } as vscode.Uri;
const codeGraphyRevealSamples = Array.from(
  { length: 101 },
  (_value, index) => 101 - index,
);
const explorerRevealSamples = Array.from(
  { length: 101 },
  (_value, index) => index + 1,
);
const mutationSamples = {
  rename: Array.from({ length: 51 }, (_value, index) => 51 - index),
  create: Array.from({ length: 51 }, (_value, index) => 151 - index),
  delete: Array.from({ length: 51 }, (_value, index) => 251 - index),
};

function createVisibleGraphProvider() {
  return {
    dispatchWebviewMessage: vi.fn(),
    isGraphOpen: vi.fn(() => true),
  };
}

function setupDependencies() {
  const order: string[] = [];
  let codeGraphyRevealIndex = 0;
  let explorerRevealIndex = 0;
  let mutationIndex = 0;
  const dependencies = {
    measureCodeGraphyRevealComparison: vi.fn(async () => {
      order.push('codegraphy-reveal');
      return codeGraphyRevealSamples[codeGraphyRevealIndex++];
    }),
    measureExplorerRevealComparison: vi.fn(async () => {
      order.push('explorer-reveal');
      return {
        metric: 'explorerRevealMs' as const,
        observation: "commands.executeCommand('revealInExplorer')" as const,
        value: explorerRevealSamples[explorerRevealIndex++],
      };
    }),
    runExplorerMutationComparison: vi.fn(async (input: { scenario: string }) => {
      order.push(`explorer-${input.scenario}`);
      const samples = mutationSamples[
        input.scenario as keyof typeof mutationSamples
      ];
      const value = samples[mutationIndex++];
      const byScenario = {
        rename: {
          metric: 'explorerRenameMs' as const,
          observation: 'workspace.onDidRenameFiles' as const,
          value,
        },
        create: {
          metric: 'explorerCreateMs' as const,
          observation: 'workspace.onDidCreateFiles' as const,
          value,
        },
        delete: {
          metric: 'explorerDeleteMs' as const,
          observation: 'workspace.onDidDeleteFiles' as const,
          value,
        },
      };
      return byScenario[input.scenario as keyof typeof byScenario];
    }),
    runtime: {
      joinPath: vi.fn((_workspace: vscode.Uri, path: string) => ({
        fsPath: `/fixture/${path}`,
      }) as vscode.Uri),
      revealInExplorer: vi.fn(async () => undefined),
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
    const provider = createVisibleGraphProvider();

    await expect(runExplorerScenarioComparison({
      dimension: 'small',
      provider: provider as never,
      scenario: 'rename',
      waitForRefreshIdle,
      workspaceFolderUri,
    }, dependencies)).resolves.toEqual({
      codeGraphyRevealMs: 51,
      explorer: { explorerRenameMs: 26, explorerRevealMs: 51 },
    });

    expect(order).toEqual([
      'show-explorer',
      'dispatch-turn',
      ...Array.from({ length: 101 }, (_value, index) => index % 2 === 0
        ? ['codegraphy-reveal', 'explorer-reveal']
        : ['explorer-reveal', 'codegraphy-reveal']).flat(),
      ...Array.from({ length: 51 }, () => [
        'dispatch-turn',
        'explorer-rename',
      ]).flat(),
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
      provider: createVisibleGraphProvider(),
      scenario: 'create',
      waitForRefreshIdle: vi.fn(async () => undefined),
      workspaceFolderUri,
    }, dependencies)).resolves.toEqual({
      explorer: { explorerCreateMs: 126 },
    });
    expect(order).toEqual([
      'show-explorer',
      'dispatch-turn',
      ...Array.from({ length: 51 }, () => [
        'dispatch-turn',
        'explorer-create',
      ]).flat(),
    ]);
  });

  it('returns the same-session delete comparison', async () => {
    const { dependencies, order } = setupDependencies();

    await expect(runExplorerScenarioComparison({
      dimension: 'small',
      provider: createVisibleGraphProvider(),
      scenario: 'delete',
      waitForRefreshIdle: vi.fn(async () => undefined),
      workspaceFolderUri,
    }, dependencies)).resolves.toEqual({
      explorer: { explorerDeleteMs: 226 },
    });
    expect(order).toEqual([
      'show-explorer',
      'dispatch-turn',
      ...Array.from({ length: 51 }, () => [
        'dispatch-turn',
        'explorer-delete',
      ]).flat(),
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
      provider: createVisibleGraphProvider(),
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
    vi.mocked(dependencies.runtime.waitForWorkbenchDispatchTurn)
      .mockResolvedValue(undefined);
    await pending;

    expect(dependencies.runExplorerMutationComparison).toHaveBeenCalledTimes(51);
  });

  it('aborts before sampling when showing Explorer hides the graph', async () => {
    const { dependencies } = setupDependencies();
    let graphOpen = true;
    vi.mocked(dependencies.runtime.showExplorer).mockImplementation(async () => {
      graphOpen = false;
    });
    const provider = {
      dispatchWebviewMessage: vi.fn(),
      isGraphOpen: vi.fn(() => graphOpen),
    };

    await expect(runExplorerScenarioComparison({
      dimension: 'small',
      provider,
      scenario: 'rename',
      waitForRefreshIdle: vi.fn(async () => undefined),
      workspaceFolderUri,
    }, dependencies)).rejects.toThrow(
      'Explorer comparison requires the CodeGraphy graph to remain open',
    );

    expect(dependencies.measureCodeGraphyRevealComparison).not.toHaveBeenCalled();
    expect(dependencies.measureExplorerRevealComparison).not.toHaveBeenCalled();
    expect(dependencies.runExplorerMutationComparison).not.toHaveBeenCalled();
  });

  it('neutralizes Explorer selection before every mutation measurement', async () => {
    const { dependencies } = setupDependencies();

    await runExplorerScenarioComparison({
      dimension: 'small',
      provider: createVisibleGraphProvider(),
      scenario: 'delete',
      waitForRefreshIdle: vi.fn(async () => undefined),
      workspaceFolderUri,
    }, dependencies);

    expect(dependencies.runtime.revealInExplorer).toHaveBeenCalledTimes(51);
    expect(dependencies.runtime.revealInExplorer).toHaveBeenCalledWith({
      fsPath: '/fixture/src/group-00000/file-000001.ts',
    });
  });

  it('passes self mutation and reveal targets through the same session', async () => {
    const { dependencies } = setupDependencies();
    const provider = createVisibleGraphProvider();

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
