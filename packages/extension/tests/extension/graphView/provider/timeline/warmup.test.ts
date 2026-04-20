import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { ensureGitAnalyzerForCachedTimeline } from '../../../../../src/extension/graphView/provider/timeline/warmup';

describe('ensureGitAnalyzerForCachedTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips warmup when the source already has a git analyzer', async () => {
    const createGitAnalyzer = vi.fn();
    const source = createSource({ _gitAnalyzer: { kind: 'git' } });

    await ensureGitAnalyzerForCachedTimeline(source as never, {
      createGitAnalyzer,
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } } as never)),
    });

    expect(createGitAnalyzer).not.toHaveBeenCalled();
  });

  it('skips warmup when the source has no analyzer', async () => {
    const createGitAnalyzer = vi.fn();
    const getWorkspaceFolder = vi.fn(() => ({ uri: { fsPath: '/workspace' } } as never));

    await ensureGitAnalyzerForCachedTimeline(createSource() as never, {
      createGitAnalyzer,
      getWorkspaceFolder,
    });

    expect(getWorkspaceFolder).not.toHaveBeenCalled();
    expect(createGitAnalyzer).not.toHaveBeenCalled();
  });

  it('skips warmup when no git-analyzer factory is available', async () => {
    const getWorkspaceFolder = vi.fn(() => ({ uri: { fsPath: '/workspace' } } as never));
    const source = createSource({
      _analyzer: {
        initialize: vi.fn(async () => undefined),
        getPluginFilterPatterns: vi.fn(() => []),
        registry: { kind: 'registry' },
      },
      _analyzerInitialized: true,
    });

    await ensureGitAnalyzerForCachedTimeline(source as never, {
      createGitAnalyzer: undefined,
      getWorkspaceFolder,
    });

    expect(getWorkspaceFolder).not.toHaveBeenCalled();
    expect(source._gitAnalyzer).toBeUndefined();
  });

  it('skips warmup when no workspace folder is available', async () => {
    const createGitAnalyzer = vi.fn();
    const initialize = vi.fn(async () => undefined);
    const source = createSource({
      _analyzer: {
        initialize,
        getPluginFilterPatterns: vi.fn(() => []),
        registry: { kind: 'registry' },
      },
      _analyzerInitialized: true,
    });

    await ensureGitAnalyzerForCachedTimeline(source as never, {
      createGitAnalyzer,
      getWorkspaceFolder: vi.fn(() => undefined),
    });

    expect(initialize).not.toHaveBeenCalled();
    expect(createGitAnalyzer).not.toHaveBeenCalled();
  });

  it('creates the cached git analyzer without reinitializing an analyzer that is already ready', async () => {
    const initialize = vi.fn(async () => undefined);
    const analyzer = {
      registry: { kind: 'registry' },
      initialize,
      getPluginFilterPatterns: vi.fn(() => ['plugin-cache/**']),
    };
    const createGitAnalyzer = vi.fn(() => ({ kind: 'git-analyzer' } as never));
    const source = createSource({
      _analyzer: analyzer,
      _analyzerInitialized: true,
      _filterPatterns: ['dist/**'],
    });

    await ensureGitAnalyzerForCachedTimeline(source as never, {
      createGitAnalyzer,
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } } as never)),
    });

    expect(initialize).not.toHaveBeenCalled();
    expect(createGitAnalyzer).toHaveBeenCalledOnce();
  });

  it('initializes the analyzer and creates a cached git analyzer with merged excludes', async () => {
    const initialize = vi.fn(async () => undefined);
    const analyzer = {
      registry: { kind: 'registry' },
      initialize,
      getPluginFilterPatterns: vi.fn(() => ['plugin-cache/**']),
    };
    const createGitAnalyzer = vi.fn(() => ({ kind: 'git-analyzer' } as never));
    const source = createSource({
      _analyzer: analyzer,
      _analyzerInitialized: false,
      _analyzerInitPromise: undefined,
      _installedPluginActivationPromise: Promise.resolve(),
      _filterPatterns: ['dist/**'],
    });

    await ensureGitAnalyzerForCachedTimeline(source as never, {
      createGitAnalyzer,
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } } as never)),
    });

    expect(initialize).toHaveBeenCalledOnce();
    expect(createGitAnalyzer).toHaveBeenCalledWith(
      source._context,
      analyzer.registry,
      '/workspace',
      expect.arrayContaining(['plugin-cache/**', 'dist/**']),
    );
    expect(source._analyzerInitialized).toBe(true);
    expect(source._analyzerInitPromise).toBeUndefined();
    expect(source._gitAnalyzer).toEqual({ kind: 'git-analyzer' });
  });

  it('omits disabled filter sources when warming the cached git analyzer', async () => {
    const analyzer = {
      registry: { kind: 'registry' },
      initialize: vi.fn(async () => undefined),
      getPluginFilterPatterns: vi.fn(() => ['plugin-cache/**']),
    };
    const createGitAnalyzer = vi.fn(() => ({ kind: 'git-analyzer' } as never));
    const source = createSource({
      _analyzer: analyzer,
      _analyzerInitialized: true,
      _filterPatterns: ['dist/**'],
    });

    await ensureGitAnalyzerForCachedTimeline(source as never, {
      createGitAnalyzer,
      getDisabledCustomFilterPatterns: vi.fn(() => ['dist/**']),
      getDisabledPluginFilterPatterns: vi.fn(() => ['plugin-cache/**']),
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } } as never)),
    });

    expect(createGitAnalyzer).toHaveBeenCalledWith(
      source._context,
      analyzer.registry,
      '/workspace',
      expect.not.arrayContaining(['plugin-cache/**', 'dist/**']),
    );
  });

  it('reuses an in-flight analyzer initialization promise instead of starting a second one', async () => {
    const initialize = vi.fn(async () => undefined);
    const analyzer = {
      registry: { kind: 'registry' },
      initialize,
      getPluginFilterPatterns: vi.fn(() => []),
    };
    const createGitAnalyzer = vi.fn(() => ({ kind: 'git-analyzer' } as never));
    const source = createSource({
      _analyzer: analyzer,
      _analyzerInitialized: false,
    });
    (source as { _analyzerInitPromise: Promise<void> | undefined })._analyzerInitPromise = Promise.resolve().then(() => {
      source._analyzerInitialized = true;
    });

    await ensureGitAnalyzerForCachedTimeline(source as never, {
      createGitAnalyzer,
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } } as never)),
    });

    expect(initialize).not.toHaveBeenCalled();
    expect(source._analyzerInitialized).toBe(true);
    expect(createGitAnalyzer).toHaveBeenCalledOnce();
  });
});

function createSource(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _context: { storageUri: { fsPath: '/storage' } } as never,
    _analyzer: undefined,
    _analyzerInitialized: true,
    _analyzerInitPromise: undefined,
    _gitAnalyzer: undefined,
    _installedPluginActivationPromise: undefined,
    _filterPatterns: [],
    _timelineActive: false,
    _currentCommitSha: undefined,
    _disabledPlugins: new Set<string>(),
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _applyViewTransform: vi.fn(),
    _sendMessage: vi.fn(),
    ...overrides,
  };
}
