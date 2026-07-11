import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  onPerfMetric,
  startPerfMetricSession,
  type PerfMetricDiagnosticEvent,
} from '@codegraphy-dev/core';
import { scheduleWorkspaceRefresh } from '../../../../src/extension/workspaceFiles/refresh/scheduler';

function makeProvider() {
  return {
    refreshChangedFiles: vi.fn().mockResolvedValue(undefined),
    refreshGitignoreMetadata: vi.fn().mockResolvedValue(undefined),
    refreshIndex: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    invalidateWorkspaceFiles: vi.fn(() => []),
    isGraphOpen: vi.fn(() => true),
    markWorkspaceRefreshPending: vi.fn(),
  };
}

async function collectWatcherMetric(input: {
  completedAt: number;
  filePaths?: readonly string[];
  fullRefresh?: boolean;
  gitignoreRefresh?: boolean;
  logMessage: string;
  provider: ReturnType<typeof makeProvider>;
  runId: string;
  scenario: 'batch-100' | 'single-save';
  startedAt: number;
}): Promise<PerfMetricDiagnosticEvent['context'][]> {
  const received: PerfMetricDiagnosticEvent[] = [];
  const subscription = onPerfMetric(event => received.push(event));
  const session = startPerfMetricSession({
    runId: input.runId,
    scenario: input.scenario,
  });
  const now = vi.fn()
    .mockReturnValueOnce(input.startedAt)
    .mockReturnValueOnce(input.completedAt);
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

  try {
    scheduleWorkspaceRefresh(
      input.provider as never,
      input.logMessage,
      [...(input.filePaths ?? [])],
      500,
      {
        fullRefresh: input.fullRefresh,
        gitignoreRefresh: input.gitignoreRefresh,
        now,
      },
    );
    await vi.advanceTimersByTimeAsync(500);
    return received.map(event => event.context);
  } finally {
    consoleSpy.mockRestore();
    session.dispose();
    subscription.dispose();
  }
}

describe('workspaceFiles/refresh/scheduler performance metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports watcher latency after the changed-file graph refresh settles', async () => {
    const contexts = await collectWatcherMetric({
      completedAt: 625,
      filePaths: ['/workspace/src/a.ts'],
      logMessage: '[CodeGraphy] File changed, refreshing graph',
      provider: makeProvider(),
      runId: 'watcher-run',
      scenario: 'single-save',
      startedAt: 100,
    });

    expect(contexts).toEqual([{
      runId: 'watcher-run',
      scenario: 'single-save',
      metric: 'watcherToGraphMs',
      value: 525,
      unit: 'ms',
      dimension: 'changed-files',
    }]);
  });

  it('attributes watcher latency to the performance session active when scheduled', async () => {
    let resolveRefresh!: () => void;
    const refreshDone = new Promise<void>(resolve => {
      resolveRefresh = resolve;
    });
    const provider = makeProvider();
    provider.refreshChangedFiles.mockReturnValue(refreshDone);
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const scheduledSession = startPerfMetricSession({
      runId: 'scheduled-run',
      scenario: 'single-save',
    });
    const now = vi.fn()
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(625);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
      500,
      { now },
    );
    await vi.advanceTimersByTimeAsync(500);
    scheduledSession.dispose();
    const laterSession = startPerfMetricSession({
      runId: 'later-run',
      scenario: 'rename',
    });

    try {
      resolveRefresh();
      await refreshDone;
      await Promise.resolve();
      expect(received.map(event => event.context.runId)).toEqual(['scheduled-run']);
    } finally {
      laterSession.dispose();
      subscription.dispose();
    }
  });

  it('emits one correlated metric without a file-operation tail for a mixed burst', async () => {
    const provider = makeProvider();
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const session = startPerfMetricSession({
      runId: 'mixed-burst-run',
      scenario: 'batch-100',
    });
    const firstNow = vi.fn()
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(160);

    try {
      scheduleWorkspaceRefresh(
        provider as never,
        '[CodeGraphy] File changed, refreshing graph',
        ['/workspace/src/a.ts'],
        32,
        { now: firstNow },
      );
      scheduleWorkspaceRefresh(
        provider as never,
        '[CodeGraphy] File created, refreshing graph',
        ['/workspace/src/b.ts'],
        500,
        { now: () => 120 },
      );
      await vi.advanceTimersByTimeAsync(32);

      expect(received.map(event => event.context)).toEqual([{
        runId: 'mixed-burst-run',
        scenario: 'batch-100',
        metric: 'watcherToGraphMs',
        value: 60,
        unit: 'ms',
        dimension: 'changed-files',
      }]);
    } finally {
      session.dispose();
      subscription.dispose();
    }
  });

  it('reports watcher latency after a full index refresh settles', async () => {
    const contexts = await collectWatcherMetric({
      completedAt: 550,
      fullRefresh: true,
      logMessage: '[CodeGraphy] Workspace changed, refreshing graph',
      provider: makeProvider(),
      runId: 'full-refresh-run',
      scenario: 'batch-100',
      startedAt: 40,
    });

    expect(contexts[0]).toMatchObject({
      dimension: 'full-refresh-index',
      metric: 'watcherToGraphMs',
      value: 510,
    });
  });

  it('reports watcher latency after a full refresh fallback settles', async () => {
    const provider = makeProvider();
    delete (provider as Partial<typeof provider>).refreshIndex;

    const contexts = await collectWatcherMetric({
      completedAt: 575,
      fullRefresh: true,
      logMessage: '[CodeGraphy] Workspace changed, refreshing graph',
      provider,
      runId: 'full-fallback-run',
      scenario: 'batch-100',
      startedAt: 60,
    });

    expect(contexts[0]).toMatchObject({
      dimension: 'full-refresh',
      metric: 'watcherToGraphMs',
      value: 515,
    });
  });

  it('reports watcher latency after a changed-file refresh fallback settles', async () => {
    const provider = makeProvider();
    delete (provider as Partial<typeof provider>).refreshChangedFiles;

    const contexts = await collectWatcherMetric({
      completedAt: 580,
      filePaths: ['/workspace/src/a.ts'],
      logMessage: '[CodeGraphy] File deleted, refreshing graph',
      provider,
      runId: 'changed-fallback-run',
      scenario: 'single-save',
      startedAt: 70,
    });

    expect(contexts[0]).toMatchObject({
      dimension: 'fallback-refresh',
      metric: 'watcherToGraphMs',
      value: 510,
    });
  });

  it('reports watcher latency after a gitignore metadata refresh settles', async () => {
    const contexts = await collectWatcherMetric({
      completedAt: 527,
      filePaths: ['/workspace/.gitignore'],
      gitignoreRefresh: true,
      logMessage: '[CodeGraphy] .gitignore changed, refreshing graph',
      provider: makeProvider(),
      runId: 'gitignore-watcher-run',
      scenario: 'single-save',
      startedAt: 20,
    });

    expect(contexts[0]).toMatchObject({
      dimension: 'gitignore-metadata',
      metric: 'watcherToGraphMs',
      value: 507,
    });
  });

  it('reports watcher latency after a gitignore index fallback settles', async () => {
    const provider = makeProvider();
    delete (provider as Partial<typeof provider>).refreshGitignoreMetadata;

    const contexts = await collectWatcherMetric({
      completedAt: 540,
      filePaths: ['/workspace/.gitignore'],
      gitignoreRefresh: true,
      logMessage: '[CodeGraphy] .gitignore changed, refreshing graph',
      provider,
      runId: 'gitignore-index-run',
      scenario: 'single-save',
      startedAt: 30,
    });

    expect(contexts[0]).toMatchObject({
      dimension: 'gitignore-index',
      metric: 'watcherToGraphMs',
      value: 510,
    });
  });
});
