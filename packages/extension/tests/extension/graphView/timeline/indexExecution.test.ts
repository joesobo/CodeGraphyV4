import { describe, expect, it, vi } from 'vitest';
import { runGraphViewTimelineIndex } from '../../../../src/extension/graphView/timeline/indexExecution';

describe('graph view timeline index execution', () => {
  it('indexes commit history, sends progress, and applies the resulting timeline state', async () => {
    const state = {
      gitAnalyzer: {
        indexHistory: vi.fn(async (onProgress, _signal, maxCommits) => {
          onProgress('scan', 1, maxCommits);
          return [{ sha: '111' }, { sha: '222' }];
        }),
      },
      indexingController: new AbortController(),
    };
    const handlers = {
      getMaxCommits: vi.fn(() => 500),
      sendMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      toErrorMessage: vi.fn((error: unknown) => String(error)),
      jumpToCommit: vi.fn(async () => undefined),
      logError: vi.fn(),
    };

    await runGraphViewTimelineIndex(state, handlers);

    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'INDEX_PROGRESS',
      payload: { phase: 'scan', current: 1, total: 500 },
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'TIMELINE_DATA',
      payload: { commits: [{ sha: '111' }, { sha: '222' }], currentSha: '222' },
    });
    expect(handlers.jumpToCommit).toHaveBeenCalledWith('222');
  });

  it('shows the no-commits message when indexing returns no commits', async () => {
    const handlers = {
      getMaxCommits: vi.fn(() => 500),
      sendMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      toErrorMessage: vi.fn((error: unknown) => String(error)),
      jumpToCommit: vi.fn(async () => undefined),
      logError: vi.fn(),
    };

    await runGraphViewTimelineIndex(
      {
        gitAnalyzer: {
          indexHistory: vi.fn(async () => []),
        },
        indexingController: new AbortController(),
      },
      handlers,
    );

    expect(handlers.showInformationMessage).toHaveBeenCalledWith('No commits found to index');
    expect(handlers.jumpToCommit).not.toHaveBeenCalled();
  });

  it('reports non-abort indexing failures and invalidates the cache', async () => {
    const error = new Error('kaboom');
    const handlers = {
      getMaxCommits: vi.fn(() => 500),
      sendMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      toErrorMessage: vi.fn(() => 'kaboom'),
      jumpToCommit: vi.fn(async () => undefined),
      logError: vi.fn(),
    };

    await runGraphViewTimelineIndex(
      {
        gitAnalyzer: {
          indexHistory: vi.fn(async () => {
            throw error;
          }),
        },
        indexingController: new AbortController(),
      },
      handlers,
    );

    expect(handlers.logError).toHaveBeenCalledWith('[CodeGraphy] Indexing failed:', error);
    expect(handlers.showErrorMessage).toHaveBeenCalledWith('Timeline indexing failed: kaboom');
    expect(handlers.sendMessage).toHaveBeenCalledWith({ type: 'CACHE_INVALIDATED' });
  });

  it('returns quietly for abort failures', async () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    const handlers = {
      getMaxCommits: vi.fn(() => 500),
      sendMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      toErrorMessage: vi.fn(() => 'aborted'),
      jumpToCommit: vi.fn(async () => undefined),
      logError: vi.fn(),
    };

    await runGraphViewTimelineIndex(
      {
        gitAnalyzer: {
          indexHistory: vi.fn(async () => {
            throw error;
          }),
        },
        indexingController: new AbortController(),
      },
      handlers,
    );

    expect(handlers.logError).not.toHaveBeenCalled();
    expect(handlers.showErrorMessage).not.toHaveBeenCalled();
    expect(handlers.sendMessage).not.toHaveBeenCalledWith({ type: 'CACHE_INVALIDATED' });
  });
});
