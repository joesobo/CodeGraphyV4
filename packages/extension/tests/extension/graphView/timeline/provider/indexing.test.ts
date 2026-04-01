import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../../src/shared/protocol/extensionToWebview';
import {
  indexGraphViewProviderRepository,
  jumpGraphViewProviderToCommit,
  resetGraphViewProviderTimeline,
  sendGraphViewProviderCachedTimeline,
} from '../../../../../src/extension/graphView/timeline/provider/indexing';

describe('graph view provider timeline indexing', () => {
  function createGraphNode(id: string) {
    return { id, label: id, color: '#ffffff' };
  }

  function createTimelineSource(
    overrides: Partial<Record<string, unknown>> = {},
  ): Record<string, unknown> {
    return {
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
      _sendMessage: vi.fn(),
      ...overrides,
    };
  }

  function createTimelineDependencies(
    overrides: Partial<Record<string, unknown>> = {},
  ): Record<string, unknown> {
    return {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      getShowOrphans: vi.fn(() => true),
      getMaxCommits: vi.fn(() => 500),
      verifyGitRepository: vi.fn(() => Promise.resolve()),
      createGitAnalyzer: vi.fn(),
      showErrorMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      buildTimelineGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
      indexRepository: vi.fn(async () => undefined),
      sendCachedTimeline: vi.fn(),
      logError: vi.fn(),
      ...overrides,
    };
  }

  it('passes the provider timeline state into the repository indexer', async () => {
    const existingGitAnalyzer = { kind: 'existing-git' } as never;
    const existingIndexingController = new AbortController();
    const source = createTimelineSource({
      _gitAnalyzer: existingGitAnalyzer,
      _indexingController: existingIndexingController,
      _timelineActive: true,
      _currentCommitSha: 'sha-0',
    });
    const deps = createTimelineDependencies({
      indexRepository: vi.fn(async state => {
        expect(state).toMatchObject({
          analyzer: source._analyzer,
          analyzerInitialized: false,
          gitAnalyzer: existingGitAnalyzer,
          indexingController: existingIndexingController,
          filterPatterns: ['dist/**'],
          timelineActive: true,
          currentCommitSha: 'sha-0',
        });
      }),
    });

    await indexGraphViewProviderRepository(source as never, deps as never);

    expect(deps.indexRepository).toHaveBeenCalledOnce();
  });

  it('delegates repository index handlers back to the provider dependencies', async () => {
    const source = createTimelineSource();
    const verifyGitRepository = vi.fn(() => Promise.resolve());
    const showErrorMessage = vi.fn();
    const showInformationMessage = vi.fn();
    const logError = vi.fn();
    const deps = createTimelineDependencies({
      verifyGitRepository,
      showErrorMessage,
      showInformationMessage,
      logError,
      indexRepository: vi.fn(async (_state, handlers) => {
        await handlers.verifyGitRepository('/workspace');
        handlers.sendMessage({ type: 'CACHE_INVALIDATED' } as ExtensionToWebviewMessage);
        handlers.showErrorMessage('timeline failed');
        handlers.showInformationMessage('timeline indexed');
        handlers.logError('timeline error', 'raw failure');
        expect(handlers.toErrorMessage(new Error('boom'))).toBe('boom');
        expect(handlers.toErrorMessage('raw failure')).toBe('raw failure');
      }),
    });

    await indexGraphViewProviderRepository(source as never, deps as never);

    expect(verifyGitRepository).toHaveBeenCalledWith('/workspace');
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'CACHE_INVALIDATED' });
    expect(showErrorMessage).toHaveBeenCalledWith('timeline failed');
    expect(showInformationMessage).toHaveBeenCalledWith('timeline indexed');
    expect(logError).toHaveBeenCalledWith('timeline error', 'raw failure');
  });

  it('syncs false timeline state from the repository indexer before and after a jump', async () => {
    const nextGitAnalyzer = {
      kind: 'git',
      getGraphDataForCommit: vi.fn(async () => ({ nodes: [], edges: [] })),
    } as never;
    const source = createTimelineSource({
      _timelineActive: true,
      _currentCommitSha: 'sha-0',
    });
    const deps = createTimelineDependencies({
      createGitAnalyzer: vi.fn(() => nextGitAnalyzer),
      buildTimelineGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
      indexRepository: vi.fn(async (state, handlers) => {
        state.analyzerInitialized = true;
        state.gitAnalyzer = nextGitAnalyzer;
        state.indexingController = new AbortController();
        state.timelineActive = false;
        state.currentCommitSha = 'abc123';

        await handlers.jumpToCommit('abc123');

        expect(source._timelineActive).toBe(false);
      }),
    });

    await indexGraphViewProviderRepository(source as never, deps as never);

    expect(source._analyzerInitialized).toBe(true);
    expect(source._gitAnalyzer).toBe(nextGitAnalyzer);
    expect(source._indexingController).toBeInstanceOf(AbortController);
    expect(source._timelineActive).toBe(false);
    expect(source._currentCommitSha).toBe('abc123');
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'COMMIT_GRAPH_DATA',
      payload: { sha: 'abc123', graphData: { nodes: [], edges: [] } },
    } satisfies ExtensionToWebviewMessage);
  });

  it('syncs true timeline state from the repository indexer before and after a jump', async () => {
    const nextGitAnalyzer = {
      kind: 'git',
      getGraphDataForCommit: vi.fn(async () => ({ nodes: [], edges: [] })),
    } as never;
    const source = createTimelineSource({
      _timelineActive: false,
      _currentCommitSha: 'sha-0',
    });
    const deps = createTimelineDependencies({
      createGitAnalyzer: vi.fn(() => nextGitAnalyzer),
      buildTimelineGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
      indexRepository: vi.fn(async (state, handlers) => {
        state.analyzerInitialized = true;
        state.gitAnalyzer = nextGitAnalyzer;
        state.indexingController = new AbortController();
        state.timelineActive = true;
        state.currentCommitSha = 'def456';

        await handlers.jumpToCommit('def456');

        expect(source._timelineActive).toBe(true);
      }),
    });

    await indexGraphViewProviderRepository(source as never, deps as never);

    expect(source._timelineActive).toBe(true);
    expect(source._currentCommitSha).toBe('def456');
  });

  it('preserves the existing timeline state when the indexer leaves it undefined', async () => {
    const nextGitAnalyzer = {
      kind: 'git',
      getGraphDataForCommit: vi.fn(async () => ({ nodes: [], edges: [] })),
    } as never;
    const source = createTimelineSource({
      _timelineActive: true,
      _currentCommitSha: 'sha-0',
    });
    const deps = createTimelineDependencies({
      createGitAnalyzer: vi.fn(() => nextGitAnalyzer),
      buildTimelineGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
      indexRepository: vi.fn(async (state, handlers) => {
        state.analyzerInitialized = true;
        state.gitAnalyzer = nextGitAnalyzer;
        state.indexingController = new AbortController();
        state.timelineActive = undefined;
        state.currentCommitSha = 'abc123';

        await handlers.jumpToCommit('abc123');

        expect(source._timelineActive).toBe(true);
      }),
    });

    await indexGraphViewProviderRepository(source as never, deps as never);

    expect(source._timelineActive).toBe(true);
    expect(source._currentCommitSha).toBe('abc123');
  });

  it('builds commit graph data and stores the active commit on jump', async () => {
    const sendMessage = vi.fn();
    const graphData = { nodes: [createGraphNode('src/index.ts')], edges: [] } satisfies IGraphData;
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

  it('returns early when there is no git analyzer to jump through', async () => {
    const sendMessage = vi.fn();
    const deps = {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      getShowOrphans: vi.fn(() => false),
      buildTimelineGraphData: vi.fn(),
    };
    const source = {
      _analyzer: { registry: { kind: 'registry' } } as never,
      _gitAnalyzer: undefined,
      _currentCommitSha: undefined,
      _disabledPlugins: new Set<string>(['plugin.test']),
      _disabledRules: new Set<string>(['rule.test']),
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _sendMessage: sendMessage,
    };

    await jumpGraphViewProviderToCommit(source as never, 'sha-1', deps as never);

    expect(source._currentCommitSha).toBeUndefined();
    expect(deps.buildTimelineGraphData).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('passes undefined workspace and registry to the graph builder when they are unavailable', async () => {
    const sendMessage = vi.fn();
    const graphData = { nodes: [createGraphNode('src/index.ts')], edges: [] } satisfies IGraphData;
    const deps = {
      getWorkspaceFolder: vi.fn(() => undefined),
      getShowOrphans: vi.fn(() => true),
      buildTimelineGraphData: vi.fn((_rawGraphData, options) => {
        expect(options).toEqual({
          disabledPlugins: new Set<string>(['plugin.test']),
          disabledRules: new Set<string>(['rule.test']),
          showOrphans: true,
          workspaceRoot: undefined,
          registry: undefined,
        });
        return graphData;
      }),
    };
    const source = {
      _analyzer: undefined,
      _gitAnalyzer: {
        getGraphDataForCommit: vi.fn(async () => ({ nodes: ['raw'], edges: [] })),
      } as never,
      _currentCommitSha: undefined,
      _disabledPlugins: new Set<string>(['plugin.test']),
      _disabledRules: new Set<string>(['rule.test']),
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _sendMessage: sendMessage,
    };

    await jumpGraphViewProviderToCommit(source as never, 'sha-2', deps as never);

    expect(deps.buildTimelineGraphData).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'COMMIT_GRAPH_DATA',
      payload: { sha: 'sha-2', graphData },
    } satisfies ExtensionToWebviewMessage);
  });

  it('resets to the first commit that still produces graph nodes', async () => {
    const sendMessage = vi.fn();
    const source = {
      _analyzer: { registry: { kind: 'registry' } } as never,
      _gitAnalyzer: {
        getCachedCommitList: vi.fn(() => [
          { sha: 'sha-1', timestamp: 1, message: 'empty', author: 'A', parents: [] },
          { sha: 'sha-2', timestamp: 2, message: 'first graph', author: 'B', parents: ['sha-1'] },
        ]),
        getGraphDataForCommit: vi
          .fn()
          .mockResolvedValueOnce({ nodes: [], edges: [] })
          .mockResolvedValueOnce({ nodes: ['raw'], edges: [] }),
      } as never,
      _currentCommitSha: 'sha-9',
      _disabledPlugins: new Set<string>(),
      _disabledRules: new Set<string>(),
      _graphData: { nodes: [createGraphNode('src/current.ts')], edges: [] } satisfies IGraphData,
      _sendMessage: sendMessage,
    };
    const graphData = { nodes: [createGraphNode('src/index.ts')], edges: [] } satisfies IGraphData;
    const deps = {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      getShowOrphans: vi.fn(() => true),
      buildTimelineGraphData: vi
        .fn()
        .mockReturnValueOnce({ nodes: [], edges: [] })
        .mockReturnValueOnce(graphData),
    };

    await resetGraphViewProviderTimeline(source as never, deps as never);

    expect(source._currentCommitSha).toBe('sha-2');
    expect(source._graphData).toBe(graphData);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'COMMIT_GRAPH_DATA',
      payload: { sha: 'sha-2', graphData },
    } satisfies ExtensionToWebviewMessage);
  });

  it('keeps the current graph when no reset candidate produces nodes', async () => {
    const sendMessage = vi.fn();
    const currentGraph = { nodes: [createGraphNode('src/current.ts')], edges: [] } satisfies IGraphData;
    const source = {
      _analyzer: { registry: { kind: 'registry' } } as never,
      _gitAnalyzer: {
        getCachedCommitList: vi.fn(() => [
          { sha: 'sha-1', timestamp: 1, message: 'empty', author: 'A', parents: [] },
        ]),
        getGraphDataForCommit: vi.fn(async () => ({ nodes: [], edges: [] })),
      } as never,
      _currentCommitSha: 'sha-9',
      _disabledPlugins: new Set<string>(),
      _disabledRules: new Set<string>(),
      _graphData: currentGraph,
      _sendMessage: sendMessage,
    };
    const deps = {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      getShowOrphans: vi.fn(() => true),
      buildTimelineGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
    };

    await resetGraphViewProviderTimeline(source as never, deps as never);

    expect(source._currentCommitSha).toBe('sha-9');
    expect(source._graphData).toBe(currentGraph);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('syncs cached timeline state back onto the provider source', () => {
    const source = {
      _gitAnalyzer: { kind: 'git' } as never,
      _timelineActive: false,
      _currentCommitSha: 'sha-0',
      _sendMessage: vi.fn(),
    };
    const deps = {
      sendCachedTimeline: vi.fn((_gitAnalyzer, state, sendMessage) => {
        expect(state).toEqual({
          timelineActive: false,
          currentCommitSha: 'sha-0',
        });
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
