import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../../src/shared/protocol/extensionToWebview';
import { DEFAULT_EXCLUDE_PATTERNS } from '../../../../../src/extension/config/defaults';
const timelineMethodMocks = vi.hoisted(() => ({
  indexRepository: vi.fn(async () => undefined),
  jumpToCommit: vi.fn(async () => undefined),
  resetTimeline: vi.fn(async () => undefined),
  sendCachedTimeline: vi.fn(),
  sendPlaybackSpeed: vi.fn(),
  invalidateTimelineCache: vi.fn(async () => undefined),
  openNodeInEditor: vi.fn(async () => undefined),
  previewFileAtCommit: vi.fn(async () => undefined),
}));

vi.mock('../../../../../src/extension/graphView/timeline/provider/indexing', () => ({
  indexGraphViewProviderRepository: timelineMethodMocks.indexRepository,
  jumpGraphViewProviderToCommit: timelineMethodMocks.jumpToCommit,
  resetGraphViewProviderTimeline: timelineMethodMocks.resetTimeline,
  sendGraphViewProviderCachedTimeline: timelineMethodMocks.sendCachedTimeline,
}));

vi.mock('../../../../../src/extension/graphView/timeline/playback', () => ({
  invalidateGraphViewTimelineCache: timelineMethodMocks.invalidateTimelineCache,
  sendGraphViewPlaybackSpeed: timelineMethodMocks.sendPlaybackSpeed,
}));

vi.mock('../../../../../src/extension/graphView/timeline/open', () => ({
  openGraphViewNodeInEditor: timelineMethodMocks.openNodeInEditor,
  previewGraphViewFileAtCommit: timelineMethodMocks.previewFileAtCommit,
}));

import { createGraphViewProviderTimelineMethods } from '../../../../../src/extension/graphView/provider/timeline/methods';

describe('graphView/provider/timeline methods', () => {
  beforeEach(() => {
    timelineMethodMocks.indexRepository.mockReset();
    timelineMethodMocks.jumpToCommit.mockReset();
    timelineMethodMocks.resetTimeline.mockReset();
    timelineMethodMocks.sendCachedTimeline.mockReset();
    timelineMethodMocks.sendPlaybackSpeed.mockReset();
    timelineMethodMocks.invalidateTimelineCache.mockReset();
    timelineMethodMocks.openNodeInEditor.mockReset();
    timelineMethodMocks.previewFileAtCommit.mockReset();
  });

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
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
    };
    const indexRepository = vi.fn(async () => undefined);
    const jumpToCommit = vi.fn(async () => undefined);
    const resetTimeline = vi.fn(async () => undefined);
    const sendCachedTimeline = vi.fn();
    const methods = createGraphViewProviderTimelineMethods(source as never, {
      indexRepository,
      jumpToCommit,
      resetTimeline,
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
    await methods._resetTimeline();
    await methods._sendCachedTimeline();

    expect(indexRepository).toHaveBeenCalledWith(source);
    expect(jumpToCommit).toHaveBeenCalledWith(source, 'abc123');
    expect(resetTimeline).toHaveBeenCalledWith(source);
    expect(sendCachedTimeline).toHaveBeenCalledWith(source);
  });

  it('warms timeline cache on startup before replaying cached timeline state', async () => {
    let resolveInstalledPlugins!: () => void;
    const installedPluginActivationPromise = new Promise<void>((resolve) => {
      resolveInstalledPlugins = resolve;
    });
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
      _disabledRules: new Set<string>(),
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
      _installedPluginActivationPromise: installedPluginActivationPromise,
    };
    const createGitAnalyzer = vi.fn(() => gitAnalyzer);
    const jumpToCommit = vi.fn(async () => undefined);
    const sendCachedTimeline = vi.fn(nextSource => {
      nextSource._timelineActive = true;
      nextSource._currentCommitSha = 'sha-latest';
    });
    const methods = createGraphViewProviderTimelineMethods(source as never, {
      indexRepository: vi.fn(async () => undefined),
      createGitAnalyzer,
      jumpToCommit,
      resetTimeline: vi.fn(async () => undefined),
      openNodeInEditor: vi.fn(async () => undefined),
      previewFileAtCommit: vi.fn(async () => undefined),
      sendCachedTimeline,
      sendPlaybackSpeed: vi.fn(),
      invalidateTimelineCache: vi.fn(async () => undefined),
      getPlaybackSpeed: vi.fn(() => 1),
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      openTextDocument: vi.fn(),
      showTextDocument: vi.fn(),
      logError: vi.fn(),
    } as never);

    const replay = methods._sendCachedTimeline();

    await Promise.resolve();
    expect(analyzer.initialize).not.toHaveBeenCalled();
    expect(createGitAnalyzer).not.toHaveBeenCalled();

    resolveInstalledPlugins();
    await replay;

    expect(analyzer.initialize).toHaveBeenCalledOnce();
    expect(createGitAnalyzer).toHaveBeenCalledWith(
      source._context,
      analyzer.registry,
      '/workspace',
      expect.arrayContaining([
        ...DEFAULT_EXCLUDE_PATTERNS,
        'plugin-cache/**',
        'dist/**',
      ]),
    );
    expect(source._gitAnalyzer).toBe(gitAnalyzer);
    expect(sendCachedTimeline).toHaveBeenCalledWith(source);
    expect(jumpToCommit).toHaveBeenCalledWith(source, 'sha-latest');
  });

  it('waits for the first workspace-ready pass before indexing timeline history', async () => {
    let resolveFirstWorkspaceReady!: () => void;
    const firstWorkspaceReadyPromise = new Promise<void>((resolve) => {
      resolveFirstWorkspaceReady = resolve;
    });
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
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
      _firstWorkspaceReadyPromise: firstWorkspaceReadyPromise,
    };
    const indexRepository = vi.fn(async () => undefined);
    const methods = createGraphViewProviderTimelineMethods(source as never, {
      indexRepository,
      jumpToCommit: vi.fn(async () => undefined),
      resetTimeline: vi.fn(async () => undefined),
      openNodeInEditor: vi.fn(async () => undefined),
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

    const indexing = methods._indexRepository();

    await Promise.resolve();
    expect(indexRepository).not.toHaveBeenCalled();

    resolveFirstWorkspaceReady();
    await indexing;

    expect(indexRepository).toHaveBeenCalledWith(source);
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
      _rawGraphData: { nodes: [], edges: [] },
      _graphData: { nodes: [], edges: [] },
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
    } as never, {
      indexRepository: vi.fn(async () => undefined),
      jumpToCommit: vi.fn(async () => undefined),
      resetTimeline: vi.fn(async () => undefined),
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
      { preview: true, preserveFocus: false },
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

  it('uses the live default selected-node behavior', async () => {
    const source = {
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
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
    };
    timelineMethodMocks.openNodeInEditor.mockImplementation(
      (async (
        _nodeId: string,
        state: { timelineActive: boolean; currentCommitSha: string | undefined },
        _handlers: unknown,
        behavior: { preview: boolean; preserveFocus: boolean },
      ) => {
        expect(state).toEqual({
          timelineActive: true,
          currentCommitSha: 'sha-1',
        });
        expect(behavior).toEqual({ preview: true, preserveFocus: false });
      }) as never,
    );

    const methods = createGraphViewProviderTimelineMethods(source as never);

    await methods._openSelectedNode('src/app.ts');
  });

  it('uses the live default activated-node behavior', async () => {
    const source = {
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
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
    };
    timelineMethodMocks.openNodeInEditor.mockImplementation(
      (async (
        _nodeId: string,
        state: { timelineActive: boolean; currentCommitSha: string | undefined },
        _handlers: unknown,
        behavior: { preview: boolean; preserveFocus: boolean },
      ) => {
        expect(state).toEqual({
          timelineActive: true,
          currentCommitSha: 'sha-1',
        });
        expect(behavior).toEqual({ preview: false, preserveFocus: false });
      }) as never,
    );

    const methods = createGraphViewProviderTimelineMethods(source as never);

    await methods._activateNode('src/app.ts');
  });

  it('previews files at a commit using workspace/editor dependencies', async () => {
    const previewFileAtCommit = vi.fn(async () => undefined);
    const getWorkspaceFolder = vi.fn(() => ({
      uri: { fsPath: '/workspace' },
      name: 'workspace',
      index: 0,
    } as never));
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
      _rawGraphData: { nodes: [], edges: [] },
      _graphData: { nodes: [], edges: [] },
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
    } as never, {
      indexRepository: vi.fn(async () => undefined),
      jumpToCommit: vi.fn(async () => undefined),
      resetTimeline: vi.fn(async () => undefined),
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
        workspaceFolder: expect.objectContaining({
          uri: { fsPath: '/workspace' },
          name: 'workspace',
          index: 0,
        }),
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
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
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
      resetTimeline: vi.fn(async () => undefined),
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

  it('uses the default preview, playback, and cache delegates with live vscode dependencies', async () => {
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
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _applyViewTransform: vi.fn(),
      _sendMessage: vi.fn(),
      _openFile: vi.fn(async () => undefined),
    };
    const configurationGet = vi.fn((key: string, fallback: unknown) =>
      key === 'timeline.playbackSpeed' ? 1.5 : fallback,
    );
    const fileUri = vscode.Uri.file('/workspace/src/app.ts');
    const document = { uri: fileUri } as vscode.TextDocument;
    const getConfiguration = vi
      .spyOn(vscode.workspace, 'getConfiguration')
      .mockReturnValue({ get: configurationGet } as never);
    const workspaceFolders = vi
      .spyOn(vscode.workspace, 'workspaceFolders', 'get')
      .mockReturnValue(undefined);
    const originalOpenTextDocument = (vscode.workspace as { openTextDocument?: unknown }).openTextDocument;
    const originalShowTextDocument = (vscode.window as { showTextDocument?: unknown }).showTextDocument;
    const openTextDocument = vi.fn(async () => document);
    const showTextDocument = vi.fn(async () => ({} as vscode.TextEditor));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    Object.defineProperty(vscode.workspace, 'openTextDocument', {
      configurable: true,
      value: openTextDocument,
    });
    Object.defineProperty(vscode.window, 'showTextDocument', {
      configurable: true,
      value: showTextDocument,
    });

    timelineMethodMocks.previewFileAtCommit.mockImplementation(
      (async (
        _sha: string,
        _filePath: string,
        handlers: {
          workspaceFolder?: { uri: { fsPath: string } };
          openTextDocument(fileUri: vscode.Uri): PromiseLike<vscode.TextDocument>;
          showTextDocument(
            document: vscode.TextDocument,
            options: { preview: boolean; preserveFocus: boolean },
          ): PromiseLike<vscode.TextEditor>;
          logError(message: string, error: unknown): void;
        },
        behavior: { preview: boolean; preserveFocus: boolean },
      ) => {
        expect(handlers.workspaceFolder).toBeUndefined();
        expect(behavior).toEqual({ preview: true, preserveFocus: false });
        await handlers.openTextDocument(fileUri);
        await handlers.showTextDocument(document, { preview: false, preserveFocus: true });
        handlers.logError('preview failed', 'boom');
      }) as never,
    );
    timelineMethodMocks.sendPlaybackSpeed.mockImplementation((speed, callback) => {
      callback({
        type: 'PLAYBACK_SPEED_UPDATED',
        payload: { speed },
      });
    });
    timelineMethodMocks.invalidateTimelineCache.mockImplementation(
      (async (
        _gitAnalyzer: { invalidateCache(): PromiseLike<void> } | undefined,
        state: { timelineActive: boolean; currentCommitSha: string | undefined },
        callback: (message: { type: 'CACHE_INVALIDATED' }) => void,
      ) => {
        expect(state).toEqual({
          timelineActive: true,
          currentCommitSha: 'sha-1',
        });
        state.timelineActive = false;
        state.currentCommitSha = undefined;
        callback({ type: 'CACHE_INVALIDATED' });
        return undefined;
      }) as never,
    );

    const methods = createGraphViewProviderTimelineMethods(source as never);

    await methods._previewFileAtCommit('sha-1', 'src/app.ts');
    methods.sendPlaybackSpeed();
    await methods.invalidateTimelineCache();

    expect(getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(configurationGet).toHaveBeenCalledWith('timeline.playbackSpeed', 1.0);
    expect(openTextDocument).toHaveBeenCalledWith(fileUri);
    expect(showTextDocument).toHaveBeenCalledWith(document, {
      preview: false,
      preserveFocus: true,
    });
    expect(consoleError).toHaveBeenCalledWith('preview failed', 'boom');
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'PLAYBACK_SPEED_UPDATED',
      payload: { speed: 1.5 },
    } satisfies ExtensionToWebviewMessage);
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'CACHE_INVALIDATED',
    } satisfies ExtensionToWebviewMessage);

    consoleError.mockRestore();
    if (originalShowTextDocument === undefined) {
      delete (vscode.window as { showTextDocument?: unknown }).showTextDocument;
    } else {
      Object.defineProperty(vscode.window, 'showTextDocument', {
        configurable: true,
        value: originalShowTextDocument,
      });
    }
    if (originalOpenTextDocument === undefined) {
      delete (vscode.workspace as { openTextDocument?: unknown }).openTextDocument;
    } else {
      Object.defineProperty(vscode.workspace, 'openTextDocument', {
        configurable: true,
        value: originalOpenTextDocument,
      });
    }
    workspaceFolders.mockRestore();
    getConfiguration.mockRestore();
  });
});
