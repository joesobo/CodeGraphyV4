import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../../src/shared/protocol/extensionToWebview';
import {
  invalidateGraphViewProviderTimelineCache,
  sendGraphViewProviderCachedTimeline,
} from '../../../../../src/extension/graphView/provider/timeline/cache';

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
      _disabledSources: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
      _installedPluginActivationPromise: Promise.resolve(),
    };
    const createGitAnalyzer = vi.fn(() => gitAnalyzer);
    const jumpToCommit = vi.fn(async () => undefined);
    const sendCachedTimeline = vi.fn((_gitAnalyzer, state) => {
      state.timelineActive = true;
      state.currentCommitSha = 'sha-latest';
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
    expect(jumpToCommit).toHaveBeenCalledOnce();
  });

  it('invalidates cached timeline state and notifies the webview', async () => {
    const gitAnalyzer = { invalidateCache: vi.fn(async () => undefined) } as never;
    const sendMessage = vi.fn();
    const source = {
      _gitAnalyzer: gitAnalyzer,
      _timelineActive: true,
      _currentCommitSha: 'sha-1',
      _sendMessage: sendMessage,
    };

    await invalidateGraphViewProviderTimelineCache(source as never, {
      invalidateTimelineCache: vi.fn(async (_gitAnalyzer, state, callback) => {
        state.timelineActive = false;
        state.currentCommitSha = undefined;
        callback({ type: 'CACHE_INVALIDATED' });
        return undefined;
      }),
    });

    expect(source._timelineActive).toBe(false);
    expect(source._currentCommitSha).toBeUndefined();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'CACHE_INVALIDATED',
    } satisfies ExtensionToWebviewMessage);
  });
});
