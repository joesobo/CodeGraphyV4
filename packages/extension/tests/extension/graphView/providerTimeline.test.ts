import { describe, expect, it, vi } from 'vitest';
import type { ExtensionToWebviewMessage, IGraphData } from '../../../src/shared/types';
import {
  indexGraphViewProviderRepository,
  jumpGraphViewProviderToCommit,
  sendGraphViewProviderCachedTimeline,
} from '../../../src/extension/graphView/providerTimeline';

describe('graph view provider timeline helpers', () => {
  it('indexes repository state and syncs the provider timeline fields', async () => {
    const sendMessage = vi.fn();
    const source = {
      _context: {} as never,
      _analyzer: {
        registry: { kind: 'registry' },
        getPluginFilterPatterns: vi.fn(() => ['plugin/**']),
        initialize: vi.fn(() => Promise.resolve()),
      } as never,
      _analyzerInitialized: false,
      _gitAnalyzer: undefined,
      _indexingController: undefined,
      _filterPatterns: ['dist/**'],
      _timelineActive: false,
      _currentCommitSha: undefined,
      _disabledPlugins: new Set<string>(),
      _disabledRules: new Set<string>(),
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _sendMessage: sendMessage,
    };
    const nextGitAnalyzer = {
      kind: 'git',
      getGraphDataForCommit: vi.fn(async () => ({ nodes: [], edges: [] })),
    } as never;
    const indexRepository = vi.fn(async (state, handlers) => {
      expect(handlers.workspaceFolder?.uri.fsPath).toBe('/workspace');
      expect(handlers.getMaxCommits()).toBe(500);
      expect(handlers.createGitAnalyzer('/workspace', ['dist/**'])).toBe(nextGitAnalyzer);
      state.analyzerInitialized = true;
      state.gitAnalyzer = nextGitAnalyzer;
      state.indexingController = new AbortController();
      state.timelineActive = true;
      state.currentCommitSha = 'abc123';
      await handlers.jumpToCommit('abc123');
    });
    const deps = {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      getShowOrphans: vi.fn(() => true),
      getMaxCommits: vi.fn(() => 500),
      verifyGitRepository: vi.fn(() => Promise.resolve()),
      createGitAnalyzer: vi.fn(() => nextGitAnalyzer),
      showErrorMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      buildTimelineGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
      indexRepository,
      sendCachedTimeline: vi.fn(),
      logError: vi.fn(),
    };

    await indexGraphViewProviderRepository(source as never, deps);

    expect(source._analyzerInitialized).toBe(true);
    expect(source._gitAnalyzer).toBe(nextGitAnalyzer);
    expect(source._indexingController).toBeInstanceOf(AbortController);
    expect(source._timelineActive).toBe(true);
    expect(source._currentCommitSha).toBe('abc123');
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'COMMIT_GRAPH_DATA',
      payload: { sha: 'abc123', graphData: { nodes: [], edges: [] } },
    } satisfies ExtensionToWebviewMessage);
  });

  it('builds commit graph data and stores the active commit on jump', async () => {
    const sendMessage = vi.fn();
    const graphData = { nodes: [{ id: 'src/index.ts' }], edges: [] } satisfies IGraphData;
    const source = {
      _analyzer: { registry: { kind: 'registry' } } as never,
      _gitAnalyzer: {
        getGraphDataForCommit: vi.fn(async () => ({ nodes: ['raw'], edges: [] })),
      } as never,
      _currentCommitSha: undefined,
      _disabledPlugins: new Set<string>(['plugin.test']),
      _disabledRules: new Set<string>(['rule.test']),
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _sendMessage: sendMessage,
    };
    const deps = {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      getShowOrphans: vi.fn(() => false),
      buildTimelineGraphData: vi.fn(() => graphData),
    };

    await jumpGraphViewProviderToCommit(source as never, 'sha-1', deps as never);

    expect(source._currentCommitSha).toBe('sha-1');
    expect(source._graphData).toBe(graphData);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'COMMIT_GRAPH_DATA',
      payload: { sha: 'sha-1', graphData },
    } satisfies ExtensionToWebviewMessage);
  });

  it('syncs cached timeline state back onto the provider source', () => {
    const source = {
      _gitAnalyzer: { kind: 'git' } as never,
      _timelineActive: false,
      _currentCommitSha: undefined,
      _sendMessage: vi.fn(),
    };
    const deps = {
      sendCachedTimeline: vi.fn((_gitAnalyzer, state, sendMessage) => {
        state.timelineActive = true;
        state.currentCommitSha = 'latest';
        sendMessage({ type: 'CACHE_INVALIDATED' });
      }),
    };

    sendGraphViewProviderCachedTimeline(source as never, deps as never);

    expect(source._timelineActive).toBe(true);
    expect(source._currentCommitSha).toBe('latest');
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'CACHE_INVALIDATED' });
  });
});
