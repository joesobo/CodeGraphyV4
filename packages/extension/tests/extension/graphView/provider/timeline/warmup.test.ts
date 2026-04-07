import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/types';
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
    expect(source._gitAnalyzer).toEqual({ kind: 'git-analyzer' });
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
    _disabledSources: new Set<string>(),
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _applyViewTransform: vi.fn(),
    _sendMessage: vi.fn(),
    ...overrides,
  };
}
