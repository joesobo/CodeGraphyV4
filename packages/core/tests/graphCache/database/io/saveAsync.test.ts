import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import {
  onPerfMetric,
  startPerfMetricSession,
  type PerfMetricContext,
  type PerfMetricSubscription,
} from '../../../../src/diagnostics/perfMetrics';
import { saveWorkspaceAnalysisDatabaseCacheAsync } from '../../../../src/graphCache/database/io/saveAsync';
import * as connectionModule from '../../../../src/graphCache/database/io/connection';
import * as pathsModule from '../../../../src/graphCache/database/io/paths';
import * as temporaryModule from '../../../../src/graphCache/database/io/temporary';
import * as writeModule from '../../../../src/graphCache/database/query/write';

const performanceMock = vi.hoisted(() => ({
  now: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('node:perf_hooks', () => ({
  performance: performanceMock,
}));

vi.mock('../../../../src/graphCache/database/io/connection', () => ({
  runStatementAsync: vi.fn(async () => undefined),
  withConnectionAsync: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/io/paths', () => ({
  ensureDatabaseDirectory: vi.fn(),
  getWorkspaceAnalysisDatabasePath: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/io/temporary', () => ({
  cleanupTemporaryDatabase: vi.fn(),
  createTemporaryDatabasePath: vi.fn(),
  replaceDatabaseCache: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/query/write', () => ({
  createWorkspaceAnalysisCacheWriterAsync: vi.fn(),
  persistAnalysisEntryAsync: vi.fn(),
  sortedCacheEntries: vi.fn(),
}));

const emptyCache = {
  version: '1',
  files: {},
} as never;

describe('graphCache/database/io/saveAsync', () => {
  const perfSubscriptions: PerfMetricSubscription[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(pathsModule.getWorkspaceAnalysisDatabasePath)
      .mockReturnValue('/workspace/.codegraphy/graph.lbug');
    vi.mocked(temporaryModule.createTemporaryDatabasePath)
      .mockReturnValue('/workspace/.codegraphy/graph.lbug.tmp');
    vi.mocked(writeModule.sortedCacheEntries).mockReturnValue([]);
    vi.mocked(writeModule.createWorkspaceAnalysisCacheWriterAsync)
      .mockResolvedValue({ connection: 'connection', fileAnalysisStatement: 'statement' } as never);
    vi.mocked(connectionModule.withConnectionAsync).mockImplementation(async (_databasePath, callback) =>
      callback('connection' as never));
  });

  afterEach(() => {
    for (const subscription of perfSubscriptions.splice(0).reverse()) {
      subscription.dispose();
    }
  });

  it('reports successful cache persistence duration and actual persisted bytes', async () => {
    const metrics: PerfMetricContext[] = [];
    perfSubscriptions.push(onPerfMetric(event => metrics.push(event.context)));
    perfSubscriptions.push(startPerfMetricSession({
      runId: 'run-save',
      scenario: 'single-save',
      operationId: 'save-1',
      dimension: 'medium-files',
    }));
    performanceMock.now.mockReturnValueOnce(100).mockReturnValueOnce(112.5);
    vi.mocked(fs.statSync)
      .mockReturnValueOnce({ size: 200 } as never)
      .mockReturnValueOnce({ size: 24 } as never);

    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', emptyCache);

    expect(metrics).toEqual([
      {
        runId: 'run-save',
        scenario: 'single-save',
        operationId: 'save-1',
        dimension: 'medium-files',
        metric: 'cacheSaveMs',
        value: 12.5,
        unit: 'ms',
      },
      {
        runId: 'run-save',
        scenario: 'single-save',
        operationId: 'save-1',
        dimension: 'medium-files',
        metric: 'cacheBytes',
        value: 224,
        unit: 'bytes',
      },
    ]);
    expect(fs.statSync).toHaveBeenNthCalledWith(1, '/workspace/.codegraphy/graph.lbug');
    expect(fs.statSync).toHaveBeenNthCalledWith(2, '/workspace/.codegraphy/graph.lbug.wal');
  });

  it('does not measure time or size when performance collection is unarmed', async () => {
    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', emptyCache);

    expect(performanceMock.now).not.toHaveBeenCalled();
    expect(fs.statSync).not.toHaveBeenCalled();
  });

  it('keeps delayed cache metrics bound to the session active when saving started', async () => {
    const metrics: PerfMetricContext[] = [];
    perfSubscriptions.push(onPerfMetric(event => metrics.push(event.context)));
    perfSubscriptions.push(startPerfMetricSession({
      runId: 'run-original',
      scenario: 'single-save',
      operationId: 'save-original',
    }));
    performanceMock.now.mockReturnValueOnce(20).mockReturnValueOnce(25);
    vi.mocked(fs.statSync)
      .mockReturnValueOnce({ size: 300 } as never)
      .mockReturnValueOnce({ size: 12 } as never);
    let resumeSave: (() => void) | undefined;
    const saveGate = new Promise<void>((resolve) => {
      resumeSave = resolve;
    });
    vi.mocked(connectionModule.withConnectionAsync).mockImplementationOnce(async (_databasePath, callback) => {
      await saveGate;
      return callback('connection' as never);
    });

    const savePromise = saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', emptyCache);
    perfSubscriptions.push(startPerfMetricSession({
      runId: 'run-replacement',
      scenario: 'rename',
      operationId: 'rename-replacement',
    }));
    resumeSave?.();
    await savePromise;

    expect(metrics.map(metric => ({
      metric: metric.metric,
      operationId: metric.operationId,
      runId: metric.runId,
      scenario: metric.scenario,
    }))).toEqual([
      {
        metric: 'cacheSaveMs',
        operationId: 'save-original',
        runId: 'run-original',
        scenario: 'single-save',
      },
      {
        metric: 'cacheBytes',
        operationId: 'save-original',
        runId: 'run-original',
        scenario: 'single-save',
      },
    ]);
  });
});
