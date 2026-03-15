import { describe, expect, it, vi } from 'vitest';
import type { ExtensionToWebviewMessage, IGraphData } from '../../../src/shared/types';
import { createGraphViewProviderTimelineMethods } from '../../../src/extension/graphView/providerTimelineMethods';

describe('graphView/providerTimelineMethods', () => {
  it('delegates repository timeline actions to the extracted provider helpers', async () => {
    const source = {
      _context: {} as never,
      _analyzer: undefined,
      _analyzerInitialized: false,
      _gitAnalyzer: undefined,
      _indexingController: undefined,
      _filterPatterns: [],
      _timelineActive: false,
      _currentCommitSha: undefined,
      _disabledPlugins: new Set<string>(),
      _disabledRules: new Set<string>(),
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
    };
    const indexRepository = vi.fn(async () => undefined);
    const jumpToCommit = vi.fn(async () => undefined);
    const sendCachedTimeline = vi.fn();
    const methods = createGraphViewProviderTimelineMethods(source as never, {
      indexRepository,
      jumpToCommit,
      openNodeInEditor: vi.fn(async () => undefined),
      previewFileAtCommit: vi.fn(async () => undefined),
      sendCachedTimeline,
      sendPlaybackSpeed: vi.fn(),
      invalidateTimelineCache: vi.fn(async () => undefined),
      getPlaybackSpeed: vi.fn(() => 1),
      getWorkspaceFolder: vi.fn(),
      openTextDocument: vi.fn(),
      showTextDocument: vi.fn(),
      logError: vi.fn(),
    });

    await methods._indexRepository();
    await methods._jumpToCommit('abc123');
    methods._sendCachedTimeline();

    expect(indexRepository).toHaveBeenCalledWith(source);
    expect(jumpToCommit).toHaveBeenCalledWith(source, 'abc123');
    expect(sendCachedTimeline).toHaveBeenCalledWith(source);
  });

  it('opens timeline nodes with the correct editor behavior', async () => {
    const openNodeInEditor = vi.fn(async () => undefined);
    const methods = createGraphViewProviderTimelineMethods({
      _context: {} as never,
      _analyzer: undefined,
      _analyzerInitialized: false,
      _gitAnalyzer: undefined,
      _indexingController: undefined,
      _filterPatterns: [],
      _timelineActive: true,
      _currentCommitSha: 'sha-1',
      _disabledPlugins: new Set<string>(),
      _disabledRules: new Set<string>(),
      _graphData: { nodes: [], edges: [] },
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
    } as never, {
      indexRepository: vi.fn(async () => undefined),
      jumpToCommit: vi.fn(async () => undefined),
      openNodeInEditor,
      previewFileAtCommit: vi.fn(async () => undefined),
      sendCachedTimeline: vi.fn(),
      sendPlaybackSpeed: vi.fn(),
      invalidateTimelineCache: vi.fn(async () => undefined),
      getPlaybackSpeed: vi.fn(() => 1),
      getWorkspaceFolder: vi.fn(),
      openTextDocument: vi.fn(),
      showTextDocument: vi.fn(),
      logError: vi.fn(),
    });

    await methods._openSelectedNode('src/app.ts');
    await methods._activateNode('src/lib.ts');

    expect(openNodeInEditor).toHaveBeenNthCalledWith(
      1,
      'src/app.ts',
      { timelineActive: true, currentCommitSha: 'sha-1' },
      expect.objectContaining({
        previewFileAtCommit: expect.any(Function),
        openFile: expect.any(Function),
      }),
      { preview: true, preserveFocus: true },
    );
    expect(openNodeInEditor).toHaveBeenNthCalledWith(
      2,
      'src/lib.ts',
      { timelineActive: true, currentCommitSha: 'sha-1' },
      expect.objectContaining({
        previewFileAtCommit: expect.any(Function),
        openFile: expect.any(Function),
      }),
      { preview: false, preserveFocus: false },
    );
  });

  it('previews files at a commit using workspace/editor dependencies', async () => {
    const previewFileAtCommit = vi.fn(async () => undefined);
    const getWorkspaceFolder = vi.fn(() => ({ uri: { fsPath: '/workspace' } }));
    const openTextDocument = vi.fn();
    const showTextDocument = vi.fn();
    const methods = createGraphViewProviderTimelineMethods({
      _context: {} as never,
      _analyzer: undefined,
      _analyzerInitialized: false,
      _gitAnalyzer: undefined,
      _indexingController: undefined,
      _filterPatterns: [],
      _timelineActive: false,
      _currentCommitSha: undefined,
      _disabledPlugins: new Set<string>(),
      _disabledRules: new Set<string>(),
      _graphData: { nodes: [], edges: [] },
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
    } as never, {
      indexRepository: vi.fn(async () => undefined),
      jumpToCommit: vi.fn(async () => undefined),
      openNodeInEditor: vi.fn(async () => undefined),
      previewFileAtCommit,
      sendCachedTimeline: vi.fn(),
      sendPlaybackSpeed: vi.fn(),
      invalidateTimelineCache: vi.fn(async () => undefined),
      getPlaybackSpeed: vi.fn(() => 1),
      getWorkspaceFolder,
      openTextDocument,
      showTextDocument,
      logError: vi.fn(),
    });

    await methods._previewFileAtCommit('sha-1', 'src/app.ts');

    expect(previewFileAtCommit).toHaveBeenCalledWith(
      'sha-1',
      'src/app.ts',
      expect.objectContaining({
        workspaceFolder: { uri: { fsPath: '/workspace' } },
        openTextDocument: expect.any(Function),
        showTextDocument: expect.any(Function),
      }),
      { preview: true, preserveFocus: false },
    );
  });

  it('sends playback speed and resets timeline cache state through helper dependencies', async () => {
    const sendMessage = vi.fn();
    const source = {
      _context: {} as never,
      _analyzer: undefined,
      _analyzerInitialized: false,
      _gitAnalyzer: { invalidateCache: vi.fn(async () => undefined) } as never,
      _indexingController: undefined,
      _filterPatterns: [],
      _timelineActive: true,
      _currentCommitSha: 'sha-1',
      _disabledPlugins: new Set<string>(),
      _disabledRules: new Set<string>(),
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _sendMessage: sendMessage,
      _openFile: vi.fn(async () => undefined),
    };
    const sendPlaybackSpeed = vi.fn((speed, callback) => {
      callback({
        type: 'PLAYBACK_SPEED_UPDATED',
        payload: { speed },
      });
    });
    const invalidateTimelineCache = vi.fn(async (_gitAnalyzer, state, callback) => {
      state.timelineActive = false;
      state.currentCommitSha = undefined;
      callback({ type: 'CACHE_INVALIDATED' });
      return undefined;
    });
    const methods = createGraphViewProviderTimelineMethods(source as never, {
      indexRepository: vi.fn(async () => undefined),
      jumpToCommit: vi.fn(async () => undefined),
      openNodeInEditor: vi.fn(async () => undefined),
      previewFileAtCommit: vi.fn(async () => undefined),
      sendCachedTimeline: vi.fn(),
      sendPlaybackSpeed,
      invalidateTimelineCache,
      getPlaybackSpeed: vi.fn(() => 1.5),
      getWorkspaceFolder: vi.fn(),
      openTextDocument: vi.fn(),
      showTextDocument: vi.fn(),
      logError: vi.fn(),
    });

    methods.sendPlaybackSpeed();
    await methods.invalidateTimelineCache();

    expect(sendPlaybackSpeed).toHaveBeenCalledWith(1.5, expect.any(Function));
    expect(invalidateTimelineCache).toHaveBeenCalledOnce();
    expect(source._timelineActive).toBe(false);
    expect(source._currentCommitSha).toBeUndefined();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'PLAYBACK_SPEED_UPDATED',
      payload: { speed: 1.5 },
    } satisfies ExtensionToWebviewMessage);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'CACHE_INVALIDATED',
    } satisfies ExtensionToWebviewMessage);
  });
});
