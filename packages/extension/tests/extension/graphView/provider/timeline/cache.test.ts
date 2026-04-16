import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../../src/shared/protocol/extensionToWebview';
import {
  sendGraphViewProviderCachedTimeline,
} from '../../../../../src/extension/graphView/provider/timeline/cache';
import { invalidateGraphViewProviderTimelineCache } from '../../../../../src/extension/graphView/provider/timeline/invalidate';

describe('graphView/provider/timeline cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replays cached timeline state and warms the analyzer once', async () => {
    const gitAnalyzer = { kind: 'git-analyzer' } as never;
    const analyzer = {
      registry: { kind: 'registry' },
      initialize: vi.fn(async () => undefined),
      getPluginFilterPatterns: vi.fn(() => ['plugin-cache/**']),
    };
    const source = {
      _context: { storageUri: { fsPath: '/storage' } } as never,
      _analyzer: analyzer as never,
      _analyzerInitialized: false,
      _analyzerInitPromise: undefined,
      _gitAnalyzer: undefined,
      _indexingController: undefined,
      _filterPatterns: ['dist/**'],
      _timelineActive: false,
      _currentCommitSha: undefined,
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
      _installedPluginActivationPromise: Promise.resolve(),
    };
    const createGitAnalyzer = vi.fn(() => gitAnalyzer);
    const jumpToCommit = vi.fn(async () => undefined);
    const sendCachedTimeline = vi.fn((_gitAnalyzer, state, callback) => {
      state.timelineActive = true;
      state.currentCommitSha = 'sha-latest';
      callback({ type: 'CACHE_INVALIDATED' });
    });

    await sendGraphViewProviderCachedTimeline(source as never, {
      indexRepository: vi.fn(async () => undefined),
      jumpToCommit,
      resetTimeline: vi.fn(async () => undefined),
      openNodeInEditor: vi.fn(async () => undefined),
      previewFileAtCommit: vi.fn(async () => undefined),
      sendCachedTimeline,
      createGitAnalyzer,
      sendPlaybackSpeed: vi.fn(),
      invalidateTimelineCache: vi.fn(async () => undefined),
      getPlaybackSpeed: vi.fn(() => 1),
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      openTextDocument: vi.fn(),
      showTextDocument: vi.fn(),
      logError: vi.fn(),
    } as never);

    expect(analyzer.initialize).toHaveBeenCalledOnce();
    expect(createGitAnalyzer).toHaveBeenCalledOnce();
    expect(source._gitAnalyzer).toBe(gitAnalyzer);
    expect(sendCachedTimeline).toHaveBeenCalledWith(
      gitAnalyzer,
      {
        timelineActive: true,
        currentCommitSha: 'sha-latest',
      },
      expect.any(Function),
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'CACHE_INVALIDATED',
    } satisfies ExtensionToWebviewMessage);
    expect(jumpToCommit).toHaveBeenCalledOnce();
    expect(jumpToCommit).toHaveBeenCalledWith(source, 'sha-latest');
  });

  it('does not jump when cached playback stays inactive', async () => {
    const gitAnalyzer = { kind: 'git-analyzer' } as never;
    const source = {
      _context: { storageUri: { fsPath: '/storage' } } as never,
      _analyzer: undefined,
      _analyzerInitialized: true,
      _analyzerInitPromise: undefined,
      _gitAnalyzer: gitAnalyzer,
      _indexingController: undefined,
      _filterPatterns: ['dist/**'],
      _timelineActive: false,
      _currentCommitSha: undefined,
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
      _installedPluginActivationPromise: Promise.resolve(),
    };
    const jumpToCommit = vi.fn(async () => undefined);

    await sendGraphViewProviderCachedTimeline(source as never, {
      sendCachedTimeline: vi.fn((_gitAnalyzer, state) => {
        expect(state).toEqual({
          timelineActive: false,
          currentCommitSha: undefined,
        });
      }),
      jumpToCommit,
    } as never);

    expect(jumpToCommit).not.toHaveBeenCalled();
    expect(source._timelineActive).toBe(false);
    expect(source._currentCommitSha).toBeUndefined();
  });

  it('does not jump when cached playback keeps the same active commit', async () => {
    const gitAnalyzer = { kind: 'git-analyzer' } as never;
    const source = {
      _context: { storageUri: { fsPath: '/storage' } } as never,
      _analyzer: undefined,
      _analyzerInitialized: true,
      _analyzerInitPromise: undefined,
      _gitAnalyzer: gitAnalyzer,
      _indexingController: undefined,
      _filterPatterns: ['dist/**'],
      _timelineActive: true,
      _currentCommitSha: 'sha-current',
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
      _installedPluginActivationPromise: Promise.resolve(),
    };
    const jumpToCommit = vi.fn(async () => undefined);

    await sendGraphViewProviderCachedTimeline(source as never, {
      sendCachedTimeline: vi.fn((_gitAnalyzer, state) => {
        state.timelineActive = true;
        state.currentCommitSha = 'sha-current';
      }),
      jumpToCommit,
    } as never);

    expect(jumpToCommit).not.toHaveBeenCalled();
    expect(source._timelineActive).toBe(true);
    expect(source._currentCommitSha).toBe('sha-current');
  });

  it('jumps when cached playback stays active but replays a different commit', async () => {
    const gitAnalyzer = { kind: 'git-analyzer' } as never;
    const source = {
      _context: { storageUri: { fsPath: '/storage' } } as never,
      _analyzer: undefined,
      _analyzerInitialized: true,
      _analyzerInitPromise: undefined,
      _gitAnalyzer: gitAnalyzer,
      _indexingController: undefined,
      _filterPatterns: ['dist/**'],
      _timelineActive: true,
      _currentCommitSha: 'sha-old',
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
      _installedPluginActivationPromise: Promise.resolve(),
    };
    const jumpToCommit = vi.fn(async () => undefined);

    await sendGraphViewProviderCachedTimeline(source as never, {
      sendCachedTimeline: vi.fn((_gitAnalyzer, state) => {
        state.timelineActive = true;
        state.currentCommitSha = 'sha-new';
      }),
      jumpToCommit,
    } as never);

    expect(jumpToCommit).toHaveBeenCalledWith(source, 'sha-new');
    expect(source._timelineActive).toBe(true);
    expect(source._currentCommitSha).toBe('sha-new');
  });

  it('does not jump when cached playback clears the commit sha', async () => {
    const gitAnalyzer = { kind: 'git-analyzer' } as never;
    const source = {
      _context: { storageUri: { fsPath: '/storage' } } as never,
      _analyzer: undefined,
      _analyzerInitialized: true,
      _analyzerInitPromise: undefined,
      _gitAnalyzer: gitAnalyzer,
      _indexingController: undefined,
      _filterPatterns: ['dist/**'],
      _timelineActive: false,
      _currentCommitSha: 'sha-old',
      _disabledPlugins: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
      _installedPluginActivationPromise: Promise.resolve(),
    };
    const jumpToCommit = vi.fn(async () => undefined);

    await sendGraphViewProviderCachedTimeline(source as never, {
      sendCachedTimeline: vi.fn((_gitAnalyzer, state) => {
        state.timelineActive = true;
        state.currentCommitSha = undefined;
      }),
      jumpToCommit,
    } as never);

    expect(jumpToCommit).not.toHaveBeenCalled();
    expect(source._timelineActive).toBe(true);
    expect(source._currentCommitSha).toBeUndefined();
  });

  it('invalidates cached timeline state and notifies the webview', async () => {
    const gitAnalyzer = { invalidateCache: vi.fn(async () => undefined) } as never;
    const nextGitAnalyzer = { kind: 'next-git-analyzer' } as never;
    const sendMessage = vi.fn();
    const source = {
      _gitAnalyzer: gitAnalyzer,
      _timelineActive: true,
      _currentCommitSha: 'sha-1',
      _sendMessage: sendMessage,
    };

    await invalidateGraphViewProviderTimelineCache(source as never, {
      invalidateTimelineCache: vi.fn(async (_gitAnalyzer, state, callback) => {
        expect(_gitAnalyzer).toBe(gitAnalyzer);
        expect(state).toEqual({
          timelineActive: true,
          currentCommitSha: 'sha-1',
        });
        state.timelineActive = false;
        state.currentCommitSha = undefined;
        callback({ type: 'CACHE_INVALIDATED' });
        return nextGitAnalyzer;
      }),
    });

    expect(source._timelineActive).toBe(false);
    expect(source._currentCommitSha).toBeUndefined();
    expect(source._gitAnalyzer).toBe(nextGitAnalyzer);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'CACHE_INVALIDATED',
    } satisfies ExtensionToWebviewMessage);
  });
});
