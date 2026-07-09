import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  onPerfMetric,
  startPerfMetricSession,
  type PerfMetricDiagnosticEvent,
} from '@codegraphy-dev/core';
import { WorkspacePipelineRefreshFacade } from '../../../../src/extension/pipeline/service/refreshFacade';
import { refreshAnalysisScopeForFacade } from '../../../../src/extension/pipeline/service/refresh/modes/analysisScope';
import { refreshChangedFilesForFacade } from '../../../../src/extension/pipeline/service/refresh/modes/changedFiles';
import { refreshGitignoreMetadataForFacade } from '../../../../src/extension/pipeline/service/refresh/modes/gitignoreMetadata';
import { refreshPluginFilesForFacade } from '../../../../src/extension/pipeline/service/refresh/modes/pluginFiles';

vi.mock('../../../../src/extension/pipeline/service/refresh/modes/analysisScope', () => ({
  refreshAnalysisScopeForFacade: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/refresh/modes/changedFiles', () => ({
  refreshChangedFilesForFacade: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/refresh/modes/gitignoreMetadata', () => ({
  refreshGitignoreMetadataForFacade: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/refresh/modes/pluginFiles', () => ({
  refreshPluginFilesForFacade: vi.fn(),
}));

class TestRefreshFacade extends WorkspacePipelineRefreshFacade {
  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
  }

  _getWorkspaceRoot = vi.fn(() => '/workspace');
  clearCache = vi.fn();
  invalidateWorkspaceFiles = vi.fn((filePaths: readonly string[]) => [...filePaths]);
}

async function collectRefreshMetric(input: {
  completedAt: number;
  refresh: (facade: TestRefreshFacade) => Promise<unknown>;
  runId: string;
  scenario: 'scope-toggle' | 'single-save';
  startedAt: number;
}): Promise<PerfMetricDiagnosticEvent['context'][]> {
  const received: PerfMetricDiagnosticEvent[] = [];
  const subscription = onPerfMetric(event => received.push(event));
  const session = startPerfMetricSession({
    runId: input.runId,
    scenario: input.scenario,
  });
  const now = vi.spyOn(performance, 'now')
    .mockReturnValueOnce(input.startedAt)
    .mockReturnValueOnce(input.completedAt);

  try {
    await input.refresh(new TestRefreshFacade());
    return received.map(event => event.context);
  } finally {
    now.mockRestore();
    session.dispose();
    subscription.dispose();
  }
}

describe('pipeline/service/refreshFacade performance metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(refreshAnalysisScopeForFacade).mockResolvedValue({ nodes: [], edges: [] });
    vi.mocked(refreshChangedFilesForFacade).mockResolvedValue({ nodes: [], edges: [] });
    vi.mocked(refreshGitignoreMetadataForFacade).mockResolvedValue({ nodes: [], edges: [] });
    vi.mocked(refreshPluginFilesForFacade).mockResolvedValue({ nodes: [], edges: [] });
  });

  it('reports changed-file refresh latency to an active performance session', async () => {
    const contexts = await collectRefreshMetric({
      completedAt: 34,
      refresh: facade => facade.refreshChangedFiles(['/workspace/src/a.ts']),
      runId: 'refresh-run',
      scenario: 'single-save',
      startedAt: 10,
    });

    expect(contexts).toEqual([{
      runId: 'refresh-run',
      scenario: 'single-save',
      metric: 'incrementalRefreshMs',
      value: 24,
      unit: 'ms',
      dimension: 'changed-files',
    }]);
  });

  it('attributes refresh latency to the performance session active when refresh starts', async () => {
    let resolveRefresh!: (graphData: { nodes: never[]; edges: never[] }) => void;
    const refreshDone = new Promise<{ nodes: never[]; edges: never[] }>(resolve => {
      resolveRefresh = resolve;
    });
    vi.mocked(refreshChangedFilesForFacade).mockReturnValueOnce(refreshDone);
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const startedSession = startPerfMetricSession({
      runId: 'started-refresh-run',
      scenario: 'single-save',
    });
    const now = vi.spyOn(performance, 'now')
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(34);
    const refresh = new TestRefreshFacade().refreshChangedFiles(['/workspace/src/a.ts']);
    startedSession.dispose();
    const laterSession = startPerfMetricSession({
      runId: 'later-refresh-run',
      scenario: 'rename',
    });

    try {
      resolveRefresh({ nodes: [], edges: [] });
      await refresh;
      expect(received.map(event => event.context.runId)).toEqual(['started-refresh-run']);
    } finally {
      now.mockRestore();
      laterSession.dispose();
      subscription.dispose();
    }
  });

  it('reports analysis-scope refresh latency to an active performance session', async () => {
    const contexts = await collectRefreshMetric({
      completedAt: 67,
      refresh: facade => facade.refreshAnalysisScope(),
      runId: 'scope-run',
      scenario: 'scope-toggle',
      startedAt: 50,
    });

    expect(contexts[0]).toMatchObject({
      dimension: 'analysis-scope',
      metric: 'incrementalRefreshMs',
      value: 17,
    });
  });

  it('reports plugin-file refresh latency to an active performance session', async () => {
    const contexts = await collectRefreshMetric({
      completedAt: 113,
      refresh: facade => facade.refreshPluginFiles(['plugin.a']),
      runId: 'plugin-run',
      scenario: 'single-save',
      startedAt: 100,
    });

    expect(contexts[0]).toMatchObject({
      dimension: 'plugin-files',
      metric: 'incrementalRefreshMs',
      value: 13,
    });
  });

  it('reports gitignore metadata refresh latency to an active performance session', async () => {
    const contexts = await collectRefreshMetric({
      completedAt: 209,
      refresh: facade => facade.refreshGitignoreMetadata(),
      runId: 'gitignore-run',
      scenario: 'single-save',
      startedAt: 200,
    });

    expect(contexts[0]).toMatchObject({
      dimension: 'gitignore-metadata',
      metric: 'incrementalRefreshMs',
      value: 9,
    });
  });
});
