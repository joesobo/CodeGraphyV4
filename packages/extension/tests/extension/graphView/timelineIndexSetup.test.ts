import { describe, expect, it, vi } from 'vitest';
import {
  prepareGraphViewTimelineIndex,
  type GraphViewTimelineIndexSetupHandlers,
  type GraphViewTimelineIndexSetupState,
} from '../../../src/extension/graphView/timelineIndexSetup';

function createState(
  overrides: Partial<GraphViewTimelineIndexSetupState> = {},
): GraphViewTimelineIndexSetupState {
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
  overrides: Partial<GraphViewTimelineIndexSetupHandlers> = {},
): GraphViewTimelineIndexSetupHandlers {
  return {
    workspaceFolder: undefined,
    verifyGitRepository: vi.fn(() => Promise.resolve()),
    createGitAnalyzer: vi.fn(() => ({
      indexHistory: vi.fn(() => Promise.resolve([])),
    })),
    showErrorMessage: vi.fn(),
    ...overrides,
  };
}

describe('graph view timeline index setup', () => {
  it('blocks indexing when no workspace folder is available', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(prepareGraphViewTimelineIndex(state, handlers)).resolves.toBe(false);

    expect(handlers.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
  });

  it('blocks indexing when the workspace is not a git repository', async () => {
    const state = createState();
    const handlers = createHandlers({
      workspaceFolder: { uri: { fsPath: '/workspace' } },
      verifyGitRepository: vi.fn(() => Promise.reject(new Error('not git'))),
    });

    await expect(prepareGraphViewTimelineIndex(state, handlers)).resolves.toBe(false);

    expect(handlers.showErrorMessage).toHaveBeenCalledWith(
      'This workspace is not a git repository',
    );
  });

  it('initializes analyzer state and creates the git analyzer once', async () => {
    const analyzer = {
      initialize: vi.fn(() => Promise.resolve()),
      getPluginFilterPatterns: vi.fn(() => ['**/*.generated.ts']),
    };
    const gitAnalyzer = {
      indexHistory: vi.fn(() => Promise.resolve([])),
    };
    const state = createState({
      analyzer,
      filterPatterns: ['src/generated/**'],
    });
    const handlers = createHandlers({
      workspaceFolder: { uri: { fsPath: '/workspace' } },
      createGitAnalyzer: vi.fn(() => gitAnalyzer),
    });

    await expect(prepareGraphViewTimelineIndex(state, handlers)).resolves.toBe(true);

    expect(analyzer.initialize).toHaveBeenCalledOnce();
    expect(state.analyzerInitialized).toBe(true);
    expect(state.gitAnalyzer).toBe(gitAnalyzer);
    expect(handlers.createGitAnalyzer).toHaveBeenCalledWith('/workspace', [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/*.map',
      '**/*.generated.ts',
      'src/generated/**',
    ]);
    expect(state.indexingController).toBeInstanceOf(AbortController);
  });
});
