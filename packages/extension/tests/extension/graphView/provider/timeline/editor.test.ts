import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import type {
  GraphViewProviderTimelineMethodDependencies,
  GraphViewProviderTimelineMethodsSource,
} from '../../../../../src/extension/graphView/provider/timeline/contracts';
import { createGraphViewProviderTimelineEditorMethods } from '../../../../../src/extension/graphView/provider/timeline/editor';

function createSource(
  overrides: Partial<GraphViewProviderTimelineMethodsSource> = {},
): GraphViewProviderTimelineMethodsSource {
  return {
    _context: {} as never,
    _analyzer: undefined,
    _analyzerInitialized: false,
    _gitAnalyzer: undefined,
    _indexingController: undefined,
    _filterPatterns: [],
    _timelineActive: true,
    _currentCommitSha: 'sha-1',
    _disabledPlugins: new Set<string>(),
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _applyViewTransform: vi.fn(),
    _sendMessage: vi.fn(),
    _openFile: vi.fn(async () => undefined),
    ...overrides,
  };
}

function createDependencies(
  overrides: Partial<GraphViewProviderTimelineMethodDependencies> = {},
): GraphViewProviderTimelineMethodDependencies {
  return {
    indexRepository: vi.fn(async () => undefined),
    jumpToCommit: vi.fn(async () => undefined),
    resetTimeline: vi.fn(async () => undefined),
    openNodeInEditor: vi.fn(async () => undefined),
    previewFileAtCommit: vi.fn(async () => undefined),
    sendCachedTimeline: vi.fn(),
    sendPlaybackSpeed: vi.fn(),
    invalidateTimelineCache: vi.fn(async () => undefined),
    getPlaybackSpeed: vi.fn(() => 1),
    getDisabledCustomFilterPatterns: vi.fn(() => []),
    getDisabledPluginFilterPatterns: vi.fn(() => []),
    getWorkspaceFolder: vi.fn(),
    openTextDocument: vi.fn(),
    showTextDocument: vi.fn(),
    logError: vi.fn(),
    ...overrides,
  };
}

describe('graphView/provider/timeline editor', () => {
  it('opens selected and activated nodes with the expected behaviors', async () => {
    const source = createSource();
    const previewFileAtCommit = vi.fn(async () => undefined);
    const dependencies = createDependencies({
      openNodeInEditor: vi.fn(async (_nodeId, _state, handlers, behavior) => {
        await handlers.previewFileAtCommit('sha-2', 'src/preview.ts', behavior);
        await handlers.openFile('src/open.ts', behavior);
      }),
      previewFileAtCommit,
    });
    const methods = createGraphViewProviderTimelineEditorMethods(source, dependencies);

    await methods._openSelectedNode('src/app.ts');
    await methods._activateNode('src/lib.ts');

    expect(dependencies.openNodeInEditor).toHaveBeenNthCalledWith(
      1,
      'src/app.ts',
      { timelineActive: true, currentCommitSha: 'sha-1' },
      expect.objectContaining({
        previewFileAtCommit: expect.any(Function),
        openFile: expect.any(Function),
      }),
      { preview: true, preserveFocus: false },
    );
    expect(dependencies.openNodeInEditor).toHaveBeenNthCalledWith(
      2,
      'src/lib.ts',
      { timelineActive: true, currentCommitSha: 'sha-1' },
      expect.objectContaining({
        previewFileAtCommit: expect.any(Function),
        openFile: expect.any(Function),
      }),
      { preview: false, preserveFocus: false },
    );
    expect(previewFileAtCommit).toHaveBeenNthCalledWith(
      1,
      'sha-2',
      'src/preview.ts',
      expect.any(Object),
      { preview: true, preserveFocus: false },
    );
    expect(previewFileAtCommit).toHaveBeenNthCalledWith(
      2,
      'sha-2',
      'src/preview.ts',
      expect.any(Object),
      { preview: false, preserveFocus: false },
    );
    expect(source._openFile).toHaveBeenNthCalledWith(
      1,
      'src/open.ts',
      { preview: true, preserveFocus: false },
    );
    expect(source._openFile).toHaveBeenNthCalledWith(
      2,
      'src/open.ts',
      { preview: false, preserveFocus: false },
    );
  });

  it('previews files using the supplied editor dependencies', async () => {
    const source = createSource();
    const workspaceFolder = { uri: { fsPath: '/workspace' } } as never;
    const openTextDocument = vi.fn();
    const showTextDocument = vi.fn();
    const logError = vi.fn();
    const dependencies = createDependencies({
      getWorkspaceFolder: vi.fn(() => workspaceFolder),
      openTextDocument,
      showTextDocument,
      logError,
      previewFileAtCommit: vi.fn(async (_sha, _filePath, handlers) => {
        await handlers.openTextDocument({ path: '/workspace/src/app.ts' } as never);
        await handlers.showTextDocument({ uri: { fsPath: '/workspace/src/app.ts' } } as never, {
          preview: false,
          preserveFocus: true,
        });
        handlers.logError('preview failed', 'boom');
      }),
    });
    const methods = createGraphViewProviderTimelineEditorMethods(source, dependencies);

    await methods._previewFileAtCommit('sha-1', 'src/app.ts');

    expect(dependencies.previewFileAtCommit).toHaveBeenCalledWith(
      'sha-1',
      'src/app.ts',
      {
        workspaceFolder,
        openTextDocument: expect.any(Function),
        showTextDocument: expect.any(Function),
        logError: expect.any(Function),
      },
      { preview: true, preserveFocus: false },
    );
    expect(openTextDocument).toHaveBeenCalledWith({ path: '/workspace/src/app.ts' });
    expect(showTextDocument).toHaveBeenCalledWith(
      { uri: { fsPath: '/workspace/src/app.ts' } },
      { preview: false, preserveFocus: true },
    );
    expect(logError).toHaveBeenCalledWith('preview failed', 'boom');
  });
});
