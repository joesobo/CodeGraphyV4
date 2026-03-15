import { describe, expect, it, vi } from 'vitest';
import {
  indexGraphViewRepository,
  type GraphViewTimelineIndexHandlers,
  type GraphViewTimelineIndexState,
} from '../../../src/extension/graphView/timelineIndex';

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
    getPluginFilterPatterns: vi.fn(() => []),
    createGitAnalyzer: vi.fn(() => ({
      indexHistory: vi.fn(() => Promise.resolve([])),
    })),
    getMaxCommits: vi.fn(() => 500),
    sendMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    toErrorMessage: vi.fn((error: unknown) => String(error)),
    jumpToCommit: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view timeline index', () => {
  it('shows an error when there is no workspace folder', async () => {
    const state = createState();
    const handlers = createHandlers();

    await indexGraphViewRepository(state, handlers);

    expect(handlers.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
  });

  it('indexes commits and activates the latest timeline state', async () => {
    const commits = [{ sha: '111' }, { sha: '222' }];
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
});
