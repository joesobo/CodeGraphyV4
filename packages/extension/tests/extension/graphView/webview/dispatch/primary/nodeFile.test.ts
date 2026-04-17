import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '@/shared/graph/contracts';
import type { IViewContext } from '@/core/views/contracts';
import {
  createGraphViewPrimaryNodeFileHandlers,
} from '../../../../../../src/extension/graphView/webview/dispatch/primaryState';
import type { GraphViewPrimaryMessageContext } from '../../../../../../src/extension/graphView/webview/dispatch/primary';

function createContext(
  overrides: Partial<GraphViewPrimaryMessageContext> = {},
): GraphViewPrimaryMessageContext {
  const context = {
    getTimelineActive: vi.fn(() => false),
    getCurrentCommitSha: vi.fn(() => undefined),
    getUserGroups: vi.fn(() => []),
    getDisabledPlugins: vi.fn(() => new Set<string>()),
    getFilterPatterns: vi.fn(() => []),
    getGraphData: vi.fn(() => ({ nodes: [], edges: [] } satisfies IGraphData)),
    getViewContext: vi.fn(() => ({ activePlugins: new Set() } satisfies IViewContext)),
    sendGraphControls: vi.fn(),
    openSelectedNode: vi.fn(() => Promise.resolve()),
    activateNode: vi.fn(() => Promise.resolve()),
    setFocusedFile: vi.fn(),
    previewFileAtCommit: vi.fn(() => Promise.resolve()),
    openFile: vi.fn(() => Promise.resolve()),
    openInEditor: vi.fn(),
    revealInExplorer: vi.fn(() => Promise.resolve()),
    copyToClipboard: vi.fn(() => Promise.resolve()),
    deleteFiles: vi.fn(() => Promise.resolve()),
    renameFile: vi.fn(() => Promise.resolve()),
    createFile: vi.fn(() => Promise.resolve()),
    toggleFavorites: vi.fn(() => Promise.resolve()),
    addToExclude: vi.fn(() => Promise.resolve()),
    indexAndSendData: vi.fn(() => Promise.resolve()),
    analyzeAndSendData: vi.fn(() => Promise.resolve()),
    refreshIndex: vi.fn(() => Promise.resolve()),
    clearCacheAndRefresh: vi.fn(() => Promise.resolve()),
    getFileInfo: vi.fn(() => Promise.resolve()),
    undo: vi.fn(() => Promise.resolve(undefined)),
    redo: vi.fn(() => Promise.resolve(undefined)),
    showInformationMessage: vi.fn(),
    changeView: vi.fn(() => Promise.resolve()),
    setDepthLimit: vi.fn(() => Promise.resolve()),
    updateDagMode: vi.fn(() => Promise.resolve()),
    updateNodeSizeMode: vi.fn(() => Promise.resolve()),
    indexRepository: vi.fn(() => Promise.resolve()),
    jumpToCommit: vi.fn(() => Promise.resolve()),
    resetTimeline: vi.fn(() => Promise.resolve()),
    sendPhysicsSettings: vi.fn(),
    updatePhysicsSetting: vi.fn(() => Promise.resolve()),
    resetPhysicsSettings: vi.fn(() => Promise.resolve()),
    workspaceFolder: undefined,
    persistLegends: vi.fn(() => Promise.resolve()),
    persistDefaultLegendVisibility: vi.fn(() => Promise.resolve()),
    recomputeGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
    createDirectory: vi.fn(() => Promise.resolve()),
    copyFile: vi.fn(() => Promise.resolve()),
    getConfig: vi.fn(<T>(_key: string, defaultValue: T) => defaultValue),
    updateConfig: vi.fn(() => Promise.resolve()),
    getPluginFilterPatterns: vi.fn(() => []),
    sendMessage: vi.fn(),
    applyViewTransform: vi.fn(),
    smartRebuild: vi.fn(),
    resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  context.sendGraphControls ??= vi.fn();

  return context as GraphViewPrimaryMessageContext;
}

describe('createGraphViewPrimaryNodeFileHandlers', () => {
  it('reads timeline values and preserves file action handlers', () => {
    const context = createContext({
      getTimelineActive: vi.fn(() => true),
      getCurrentCommitSha: vi.fn(() => 'abc123'),
    });

    const handlers = createGraphViewPrimaryNodeFileHandlers(context);

    expect(handlers.timelineActive).toBe(true);
    expect(handlers.currentCommitSha).toBe('abc123');
    expect(handlers.openSelectedNode).toBe(context.openSelectedNode);
    expect(handlers.setFocusedFile).toBe(context.setFocusedFile);
    expect(handlers.previewFileAtCommit).toBe(context.previewFileAtCommit);
    expect(handlers.getFileInfo).toBe(context.getFileInfo);
    expect(handlers.indexGraph).toBeDefined();
    expect(handlers.refreshGraph).toBeDefined();
  });

  it('routes graph index and refresh through the expected provider methods', async () => {
    const context = createContext();
    const handlers = createGraphViewPrimaryNodeFileHandlers(context);

    await handlers.indexGraph();
    await handlers.refreshGraph();

    expect(context.indexAndSendData).toHaveBeenCalledOnce();
    expect(context.refreshIndex).toHaveBeenCalledOnce();
  });
});
