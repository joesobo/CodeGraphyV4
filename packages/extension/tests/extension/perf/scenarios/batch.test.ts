import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

import {
  PERF_BATCH_BASE_BRANCH,
  PERF_BATCH_TARGET_BRANCH,
  runBatchBranchScenario,
  type BatchBranchScenarioDependencies,
} from '../../../../src/extension/perf/scenarios/batch';
import type { PerfScenarioOperationRunner } from '../../../../src/extension/perf/scenarios/contracts';

function uri(fsPath: string): vscode.Uri {
  return { fsPath, path: fsPath } as vscode.Uri;
}

function setup(originalBranch = 'feature/original') {
  let currentBranch = originalBranch;
  const gitCalls: string[][] = [];
  const refreshOrdering: string[] = [];
  const refreshWaitDisposers: Array<ReturnType<typeof vi.fn>> = [];
  const armWorkspaceRefreshIdleWait = vi.fn(() => {
    refreshOrdering.push('arm');
    const dispose = vi.fn();
    refreshWaitDisposers.push(dispose);
    return { dispose, promise: Promise.resolve() };
  });
  const dependencies = {
    armWorkspaceRefreshIdleWait,
    execGit: vi.fn(async (arguments_) => {
      gitCalls.push(arguments_);
      if (arguments_[0] === 'symbolic-ref') return `${currentBranch}\n`;
      if (arguments_[0] === 'rev-parse') return '0123456789abcdef\n';
      if (arguments_[0] === 'switch') {
        refreshOrdering.push(`switch:${arguments_.at(-1)}`);
        currentBranch = arguments_.at(-1) ?? '';
        return '';
      }
      throw new Error(`Unexpected git arguments: ${arguments_.join(' ')}`);
    }),
  } satisfies BatchBranchScenarioDependencies;

  return {
    armWorkspaceRefreshIdleWait,
    currentBranch: () => currentBranch,
    dependencies,
    gitCalls,
    refreshOrdering,
    refreshWaitDisposers,
  };
}

describe('extension/perf/scenarios/batch', () => {
  it('measures three balanced add-delete pairs with unique operations', async () => {
    const harness = setup();
    const expectedBranches = [
      PERF_BATCH_TARGET_BRANCH,
      PERF_BATCH_BASE_BRANCH,
      PERF_BATCH_TARGET_BRANCH,
      PERF_BATCH_BASE_BRANCH,
      PERF_BATCH_TARGET_BRANCH,
      PERF_BATCH_BASE_BRANCH,
    ];
    let operationIndex = 0;
    const runOperation: PerfScenarioOperationRunner = vi.fn(async (operation, action) => {
      const expectedOrigin = operationIndex % 2 === 0
        ? PERF_BATCH_BASE_BRANCH
        : PERF_BATCH_TARGET_BRANCH;
      expect(harness.currentBranch()).toBe(expectedOrigin);
      expect(operation).toEqual({
        operationId: `run-1:batch-100:medium:${operationIndex + 4}`,
        runId: 'run-1',
        scenario: 'batch-100',
        dimension: 'medium',
      });
      await action();
      expect(harness.currentBranch()).toBe(expectedBranches[operationIndex]);
      operationIndex += 1;
      return { operation: 'complete' };
    });

    const result = await runBatchBranchScenario({
      dimension: 'medium',
      ordinal: 4,
      provider: {} as never,
      runId: 'run-1',
      runOperation,
      workspaceFolderUri: uri('/workspace'),
    }, harness.dependencies);

    expect(result).toEqual({
      baseBranch: PERF_BATCH_BASE_BRANCH,
      dimension: 'medium',
      operationIds: [
        'run-1:batch-100:medium:4',
        'run-1:batch-100:medium:5',
        'run-1:batch-100:medium:6',
        'run-1:batch-100:medium:7',
        'run-1:batch-100:medium:8',
        'run-1:batch-100:medium:9',
      ],
      restored: true,
      scenario: 'batch-100',
      targetBranch: PERF_BATCH_TARGET_BRANCH,
    });
    expect(runOperation).toHaveBeenCalledTimes(6);
    expect(harness.gitCalls.filter(arguments_ => arguments_[0] === 'switch')).toEqual([
      ['switch', '--quiet', PERF_BATCH_BASE_BRANCH],
      ['switch', '--quiet', PERF_BATCH_TARGET_BRANCH],
      ['switch', '--quiet', PERF_BATCH_BASE_BRANCH],
      ['switch', '--quiet', PERF_BATCH_TARGET_BRANCH],
      ['switch', '--quiet', PERF_BATCH_BASE_BRANCH],
      ['switch', '--quiet', PERF_BATCH_TARGET_BRANCH],
      ['switch', '--quiet', PERF_BATCH_BASE_BRANCH],
      ['switch', '--quiet', 'feature/original'],
    ]);
    expect(harness.refreshOrdering).toEqual([
      'arm',
      `switch:${PERF_BATCH_BASE_BRANCH}`,
      'arm',
      `switch:${PERF_BATCH_TARGET_BRANCH}`,
      'arm',
      `switch:${PERF_BATCH_BASE_BRANCH}`,
      'arm',
      `switch:${PERF_BATCH_TARGET_BRANCH}`,
      'arm',
      `switch:${PERF_BATCH_BASE_BRANCH}`,
      'arm',
      `switch:${PERF_BATCH_TARGET_BRANCH}`,
      'arm',
      `switch:${PERF_BATCH_BASE_BRANCH}`,
      'arm',
      'switch:feature/original',
    ]);
    expect(harness.refreshWaitDisposers.every(dispose => dispose.mock.calls.length === 1))
      .toBe(true);
    expect(harness.currentBranch()).toBe('feature/original');
  });

  it('restores the original branch when the correlated operation fails', async () => {
    const harness = setup(PERF_BATCH_BASE_BRANCH);
    const runOperation: PerfScenarioOperationRunner = async (_operation, action) => {
      await action();
      throw new Error('acknowledgement failed');
    };

    await expect(runBatchBranchScenario({
      dimension: 'large',
      ordinal: 1,
      provider: {} as never,
      runId: 'run-failure',
      runOperation,
      workspaceFolderUri: uri('/workspace'),
    }, harness.dependencies)).rejects.toThrow('acknowledgement failed');

    expect(harness.gitCalls.filter(arguments_ => arguments_[0] === 'switch')).toEqual([
      ['switch', '--quiet', PERF_BATCH_TARGET_BRANCH],
      ['switch', '--quiet', PERF_BATCH_BASE_BRANCH],
    ]);
    expect(harness.currentBranch()).toBe(PERF_BATCH_BASE_BRANCH);
  });

  it('preserves the operation failure when the failed switch already restored HEAD', async () => {
    const harness = setup(PERF_BATCH_BASE_BRANCH);
    let operationIndex = 0;
    const runOperation: PerfScenarioOperationRunner = async (_operation, action) => {
      const currentOperation = operationIndex;
      operationIndex += 1;
      await action();
      if (currentOperation === 1) {
        throw new Error('graph acknowledgement failed');
      }
      return { operation: 'complete' };
    };

    await expect(runBatchBranchScenario({
      dimension: 'self',
      ordinal: 0,
      provider: {} as never,
      runId: 'run-restored-failure',
      runOperation,
      workspaceFolderUri: uri('/workspace'),
    }, harness.dependencies)).rejects.toThrow('graph acknowledgement failed');

    expect(harness.gitCalls.filter(arguments_ => arguments_[0] === 'switch')).toEqual([
      ['switch', '--quiet', PERF_BATCH_TARGET_BRANCH],
      ['switch', '--quiet', PERF_BATCH_BASE_BRANCH],
    ]);
    expect(harness.armWorkspaceRefreshIdleWait).toHaveBeenCalledTimes(2);
    expect(harness.currentBranch()).toBe(PERF_BATCH_BASE_BRANCH);
  });
});
