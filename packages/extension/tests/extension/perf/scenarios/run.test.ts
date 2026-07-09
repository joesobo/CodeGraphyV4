import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import {
  runNonOpenPerfScenario,
  type NonOpenPerfScenarioDependencies,
  type RunNonOpenPerfScenarioInput,
} from '../../../../src/extension/perf/scenarios/run';
import type { PerfScenarioOperationRunner } from '../../../../src/extension/perf/scenarios/contracts';

function setupInput(
  scenario: RunNonOpenPerfScenarioInput['scenario'],
): RunNonOpenPerfScenarioInput {
  return {
    dimension: 'medium',
    provider: {
      refresh: vi.fn(async () => undefined),
    } as never,
    runId: 'run-1',
    scenario,
    workspaceFolderUri: vscode.Uri.file('/workspace'),
  };
}

function setupDependencies(
  overrides: Partial<NonOpenPerfScenarioDependencies> = {},
): NonOpenPerfScenarioDependencies {
  return {
    runBatchBranchScenario: vi.fn(),
    runDocumentSaveScenario: vi.fn(),
    runExplorerScenarioComparison: vi.fn(),
    runFileMutationScenario: vi.fn(),
    ...overrides,
  };
}

const runOperation: PerfScenarioOperationRunner = vi.fn();

describe('extension/perf/scenarios/run', () => {
  it('routes single-save with deterministic ordinal zero', async () => {
    const input = setupInput('single-save');
    const result = { scenario: 'single-save', restored: true };
    const dependencies = setupDependencies({
      runDocumentSaveScenario: vi.fn(async () => result as never),
    });

    await expect(runNonOpenPerfScenario(
      input,
      runOperation,
      dependencies,
    )).resolves.toBe(result);
    expect(dependencies.runDocumentSaveScenario).toHaveBeenCalledWith({
      dimension: input.dimension,
      ordinal: 0,
      provider: input.provider,
      runId: input.runId,
      runOperation,
      workspaceFolderUri: input.workspaceFolderUri,
    });
  });

  it.each(['rename', 'create', 'delete'] as const)(
    'runs the same-session Explorer %s comparison after CodeGraphy cleanup',
    async (scenario) => {
      const input = setupInput(scenario);
      const result = { scenario, restored: true };
      const comparisonByScenario = {
        rename: {
          codeGraphyRevealMs: 7,
          explorer: { explorerRenameMs: 11, explorerRevealMs: 5 },
        },
        create: { explorer: { explorerCreateMs: 12 } },
        delete: { explorer: { explorerDeleteMs: 13 } },
      } as const;
      const dependencies = setupDependencies({
        runFileMutationScenario: vi.fn(async () => result as never),
        runExplorerScenarioComparison: vi.fn(async () => comparisonByScenario[scenario]),
      });

      await expect(runNonOpenPerfScenario(
        input,
        runOperation,
        dependencies,
      )).resolves.toEqual({
        ...result,
        comparison: comparisonByScenario[scenario],
      });
      expect(dependencies.runFileMutationScenario).toHaveBeenCalledWith({
        armRefreshIdle: expect.any(Function),
        dimension: input.dimension,
        ordinal: 0,
        refreshGraph: expect.any(Function),
        runId: input.runId,
        runOperation,
        scenario,
        workspaceFolderUri: input.workspaceFolderUri,
      });

      const routedInput = vi.mocked(dependencies.runFileMutationScenario)
        .mock.calls[0][0];
      await routedInput.refreshGraph();
      expect(input.provider.refresh).toHaveBeenCalledOnce();
      expect(dependencies.runExplorerScenarioComparison).toHaveBeenCalledWith({
        dimension: input.dimension,
        provider: input.provider,
        scenario,
        waitForRefreshIdle: expect.any(Function),
        workspaceFolderUri: input.workspaceFolderUri,
      });
      expect(vi.mocked(dependencies.runFileMutationScenario).mock.invocationCallOrder[0])
        .toBeLessThan(
          vi.mocked(dependencies.runExplorerScenarioComparison).mock.invocationCallOrder[0],
        );
    },
  );

  it('routes batch-100 with deterministic ordinal zero', async () => {
    const input = setupInput('batch-100');
    const result = { scenario: 'batch-100', restored: true };
    const dependencies = setupDependencies({
      runBatchBranchScenario: vi.fn(async () => result as never),
    });

    await expect(runNonOpenPerfScenario(
      input,
      runOperation,
      dependencies,
    )).resolves.toBe(result);
    expect(dependencies.runBatchBranchScenario).toHaveBeenCalledWith({
      dimension: input.dimension,
      ordinal: 0,
      provider: input.provider,
      runId: input.runId,
      runOperation,
      workspaceFolderUri: input.workspaceFolderUri,
    });
  });

  it.each([
    ['interaction-burst', 'runInteractionBurstScenario'],
    ['scope-toggle', 'runScopeToggleScenario'],
    ['idle-watch', 'runIdleWatchScenario'],
  ] as const)('routes %s through its deferred scenario hook', async (scenario, hook) => {
    const input = setupInput(scenario);
    const result = { scenario, deferred: false };
    const deferredRunner = vi.fn(async () => result);
    const dependencies = setupDependencies({ [hook]: deferredRunner });

    await expect(runNonOpenPerfScenario(
      input,
      runOperation,
      dependencies,
    )).resolves.toBe(result);
    expect(deferredRunner).toHaveBeenCalledWith({
      ...input,
      ordinal: 0,
      runOperation,
    });
  });

  it.each([
    'interaction-burst',
    'scope-toggle',
    'idle-watch',
  ] as const)('reports %s as unsupported when its hook is absent', async (scenario) => {
    await expect(runNonOpenPerfScenario(
      setupInput(scenario),
      runOperation,
      setupDependencies(),
    )).rejects.toThrow(`Unsupported performance scenario: ${scenario}`);
  });
});
