import { describe, expect, it, vi } from 'vitest';
import {
  prepareGraphViewTimelineIndex,
  type GraphViewTimelineIndexSetupHandlers,
  type GraphViewTimelineIndexSetupState,
} from '../../../../src/extension/graphView/timeline/indexSetup';

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

    const ready = await prepareGraphViewTimelineIndex(state, handlers);

    expect(ready).toBe(false);
    expect(handlers.showErrorMessage).toHaveBeenCalledWith('No workspace folder open');
  });

  it('blocks indexing when the workspace is not a git repository', async () => {
    const state = createState();
    const handlers = createHandlers({
      workspaceFolder: { uri: { fsPath: '/workspace' } },
      verifyGitRepository: vi.fn(() => Promise.reject(new Error('not git'))),
    });

    const ready = await prepareGraphViewTimelineIndex(state, handlers);

    expect(ready).toBe(false);
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

    const ready = await prepareGraphViewTimelineIndex(state, handlers);

    expect(ready).toBe(true);
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

  it('returns false after preparing the controller when analyzer state is unavailable', async () => {
    const state = createState();
    const handlers = createHandlers({
      workspaceFolder: { uri: { fsPath: '/workspace' } },
    });

    const ready = await prepareGraphViewTimelineIndex(state, handlers);

    expect(ready).toBe(false);
    expect(state.indexingController).toBeInstanceOf(AbortController);
    expect(handlers.createGitAnalyzer).not.toHaveBeenCalled();
  });

  it('reuses initialized analyzer and existing git analyzer instances', async () => {
    const analyzer = {
      initialize: vi.fn(() => Promise.resolve()),
      getPluginFilterPatterns: vi.fn(() => ['**/*.generated.ts']),
    };
    const existingGitAnalyzer = {
      indexHistory: vi.fn(() => Promise.resolve([])),
    };
    const previousController = new AbortController();
    const abortSpy = vi.spyOn(previousController, 'abort');
    const state = createState({
      analyzer,
      analyzerInitialized: true,
      gitAnalyzer: existingGitAnalyzer,
      indexingController: previousController,
      filterPatterns: ['src/generated/**'],
    });
    const handlers = createHandlers({
      workspaceFolder: { uri: { fsPath: '/workspace' } },
    });

    const ready = await prepareGraphViewTimelineIndex(state, handlers);

    expect(ready).toBe(true);
    expect(abortSpy).toHaveBeenCalledOnce();
    expect(analyzer.initialize).not.toHaveBeenCalled();
    expect(handlers.createGitAnalyzer).not.toHaveBeenCalled();
    expect(state.gitAnalyzer).toBe(existingGitAnalyzer);
    expect(state.indexingController).toBeInstanceOf(AbortController);
    expect(state.indexingController).not.toBe(previousController);
  });
});
