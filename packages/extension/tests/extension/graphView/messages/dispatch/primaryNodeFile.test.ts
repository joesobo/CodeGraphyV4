import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/types';
import type { IViewContext } from '../../../../../src/core/views';
import {
  createGraphViewPrimaryNodeFileHandlers,
} from '../../../../../src/extension/graphView/messages/dispatch/primaryNodeFile';
import type { GraphViewPrimaryMessageContext } from '../../../../../src/extension/graphView/messages/dispatch/primary';

function createContext(
  overrides: Partial<GraphViewPrimaryMessageContext> = {},
): GraphViewPrimaryMessageContext {
  return {
    getTimelineActive: vi.fn(() => false),
    getCurrentCommitSha: vi.fn(() => undefined),
    getUserGroups: vi.fn(() => []),
    getActiveViewId: vi.fn(() => 'codegraphy.connections'),
    getDisabledPlugins: vi.fn(() => new Set<string>()),
    getDisabledRules: vi.fn(() => new Set<string>()),
    getFilterPatterns: vi.fn(() => []),
    getGraphData: vi.fn(() => ({ nodes: [], edges: [] } satisfies IGraphData)),
    getViewContext: vi.fn(() => ({ activePlugins: new Set() } satisfies IViewContext)),
    openSelectedNode: vi.fn(() => Promise.resolve()),
    activateNode: vi.fn(() => Promise.resolve()),
    previewFileAtCommit: vi.fn(() => Promise.resolve()),
    openFile: vi.fn(() => Promise.resolve()),
    revealInExplorer: vi.fn(() => Promise.resolve()),
    copyToClipboard: vi.fn(() => Promise.resolve()),
    deleteFiles: vi.fn(() => Promise.resolve()),
    renameFile: vi.fn(() => Promise.resolve()),
    createFile: vi.fn(() => Promise.resolve()),
    toggleFavorites: vi.fn(() => Promise.resolve()),
    addToExclude: vi.fn(() => Promise.resolve()),
    analyzeAndSendData: vi.fn(() => Promise.resolve()),
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
    sendPhysicsSettings: vi.fn(),
    updatePhysicsSetting: vi.fn(() => Promise.resolve()),
    resetPhysicsSettings: vi.fn(() => Promise.resolve()),
    workspaceFolder: undefined,
    persistGroups: vi.fn(() => Promise.resolve()),
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
    expect(handlers.previewFileAtCommit).toBe(context.previewFileAtCommit);
    expect(handlers.getFileInfo).toBe(context.getFileInfo);
  });
});
