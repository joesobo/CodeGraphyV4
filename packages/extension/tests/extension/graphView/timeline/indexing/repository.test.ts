import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  indexGraphViewRepository,
  type GraphViewTimelineIndexHandlers,
  type GraphViewTimelineIndexState,
} from '../../../../../src/extension/graphView/timeline/indexing/repository';

afterEach(() => {
  vi.doUnmock('../../../../../src/extension/graphView/timeline/indexing/setup');
  vi.doUnmock('../../../../../src/extension/graphView/timeline/indexing/run');
  vi.resetModules();
});

function createState(
  overrides: Partial<GraphViewTimelineIndexState> = {},
): GraphViewTimelineIndexState {
  return {
    analyzer: undefined,
    analyzerInitialized: false,
    gitAnalyzer: undefined,
    indexingController: undefined,
    filterPatterns: [],
    ...overrides,
  };
}

function createHandlers(
  overrides: Partial<GraphViewTimelineIndexHandlers> = {},
): GraphViewTimelineIndexHandlers {
  return {
    workspaceFolder: undefined,
    verifyGitRepository: vi.fn(() => Promise.resolve()),
    createGitAnalyzer: vi.fn(() => ({
      indexHistory: vi.fn(() => Promise.resolve([])),
    })),
    getMaxCommits: vi.fn(() => 500),
    sendMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    toErrorMessage: vi.fn((error: unknown) => String(error)),
    jumpToCommit: vi.fn(() => Promise.resolve()),
    logError: vi.fn(),
    ...overrides,
  };
}

describe('graph view timeline repository', () => {
  it('shows an error when there is no workspace folder', async () => {
    const state = createState();
    const handlers = createHandlers();

    await indexGraphViewRepository(state, handlers);

    expect(handlers.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
  });

  it('stops before execution when the index setup is not ready', async () => {
    vi.resetModules();

    const prepareGraphViewTimelineIndex = vi.fn(async () => false);
    const runGraphViewTimelineIndex = vi.fn(async () => undefined);

    vi.doMock('../../../../../src/extension/graphView/timeline/indexing/setup', () => ({
      prepareGraphViewTimelineIndex,
    }));
    vi.doMock('../../../../../src/extension/graphView/timeline/indexing/run', () => ({
      runGraphViewTimelineIndex,
    }));

    const { indexGraphViewRepository: indexRepository } = await import(
      '../../../../../src/extension/graphView/timeline/indexing/repository'
    );

    await indexRepository(
      createState({
        gitAnalyzer: {
          indexHistory: vi.fn(() => Promise.resolve([])),
        },
        indexingController: new AbortController(),
      }),
      createHandlers(),
    );

    expect(prepareGraphViewTimelineIndex).toHaveBeenCalledOnce();
    expect(runGraphViewTimelineIndex).not.toHaveBeenCalled();
  });

  it('stops before execution when setup leaves timeline state incomplete', async () => {
    vi.resetModules();

    const prepareGraphViewTimelineIndex = vi.fn(async () => true);
    const runGraphViewTimelineIndex = vi.fn(async () => undefined);

    vi.doMock('../../../../../src/extension/graphView/timeline/indexing/setup', () => ({
      prepareGraphViewTimelineIndex,
    }));
    vi.doMock('../../../../../src/extension/graphView/timeline/indexing/run', () => ({
      runGraphViewTimelineIndex,
    }));

    const { indexGraphViewRepository: indexRepository } = await import(
      '../../../../../src/extension/graphView/timeline/indexing/repository'
    );

    await indexRepository(
      createState({
        gitAnalyzer: undefined,
        indexingController: new AbortController(),
      }),
      createHandlers(),
    );
    await indexRepository(
      createState({
        gitAnalyzer: {
          indexHistory: vi.fn(() => Promise.resolve([])),
        },
        indexingController: undefined,
      }),
      createHandlers(),
    );

    expect(prepareGraphViewTimelineIndex).toHaveBeenCalledTimes(2);
    expect(runGraphViewTimelineIndex).not.toHaveBeenCalled();
  });

  it('indexes commits and activates the latest timeline state', async () => {
    const commits = [
      { sha: '111', timestamp: 1, message: 'one', author: 'A', parents: [] },
      { sha: '222', timestamp: 2, message: 'two', author: 'B', parents: ['111'] },
    ];
    const gitAnalyzer = {
      indexHistory: vi.fn((_progress: unknown, _signal: AbortSignal, _maxCommits: number) =>
        Promise.resolve(commits),
      ),
    };
    const state = createState({
      analyzer: {
        initialize: vi.fn(() => Promise.resolve()),
        getPluginFilterPatterns: vi.fn(() => []),
      },
      analyzerInitialized: false,
    });
    const handlers = createHandlers({
      workspaceFolder: { uri: { fsPath: '/test/workspace' } },
      createGitAnalyzer: vi.fn(() => gitAnalyzer),
    });

    await indexGraphViewRepository(state, handlers);

    expect(handlers.verifyGitRepository).toHaveBeenCalledWith('/test/workspace');
    expect(handlers.createGitAnalyzer).toHaveBeenCalledWith('/test/workspace', [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.git/**',
      '**/.codegraphy/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/*.map',
    ]);
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'TIMELINE_DATA',
      payload: { commits, currentSha: '222' },
    });
    expect(handlers.jumpToCommit).toHaveBeenCalledWith('222');
    expect(state.analyzerInitialized).toBe(true);
    expect(state.timelineActive).toBe(true);
    expect(state.currentCommitSha).toBe('222');
  });

  it('forwards execution handlers to the timeline runner', async () => {
    vi.resetModules();

    const prepareGraphViewTimelineIndex = vi.fn(async () => true);
    const runGraphViewTimelineIndex = vi.fn(async (_state, handlers) => {
      expect(handlers.getMaxCommits()).toBe(250);
      handlers.sendMessage({ type: 'TIMELINE_DATA', payload: { commits: [], currentSha: 'sha-1' } });
      handlers.showInformationMessage('indexed');
      handlers.showErrorMessage('failed');
      expect(handlers.toErrorMessage(new Error('boom'))).toBe('boom');
      await handlers.jumpToCommit('sha-1');
      handlers.logError('timeline failed', new Error('boom'));
    });

    vi.doMock('../../../../../src/extension/graphView/timeline/indexing/setup', () => ({
      prepareGraphViewTimelineIndex,
    }));
    vi.doMock('../../../../../src/extension/graphView/timeline/indexing/run', () => ({
      runGraphViewTimelineIndex,
    }));

    const { indexGraphViewRepository: indexRepository } = await import(
      '../../../../../src/extension/graphView/timeline/indexing/repository'
    );
    const handlers = createHandlers({
      getMaxCommits: vi.fn(() => 250),
      sendMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      toErrorMessage: vi.fn(() => 'boom'),
      jumpToCommit: vi.fn(() => Promise.resolve()),
      logError: vi.fn(),
    });

    await indexRepository(
      createState({
        gitAnalyzer: {
          indexHistory: vi.fn(() => Promise.resolve([])),
        },
        indexingController: new AbortController(),
      }),
      handlers,
    );

    expect(runGraphViewTimelineIndex).toHaveBeenCalledOnce();
    expect(handlers.getMaxCommits).toHaveBeenCalledOnce();
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'TIMELINE_DATA',
      payload: { commits: [], currentSha: 'sha-1' },
    });
    expect(handlers.showInformationMessage).toHaveBeenCalledWith('indexed');
    expect(handlers.showErrorMessage).toHaveBeenCalledWith('failed');
    expect(handlers.toErrorMessage).toHaveBeenCalledOnce();
    expect(handlers.jumpToCommit).toHaveBeenCalledWith('sha-1');
    expect(handlers.logError).toHaveBeenCalledWith('timeline failed', expect.any(Error));
  });
});
