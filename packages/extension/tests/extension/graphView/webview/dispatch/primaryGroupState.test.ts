import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '@/shared/graph/types';
import type { IGroup } from '@/shared/settings/groups';
import type { IViewContext } from '@/core/views/contracts';
import {
  createGraphViewPrimaryGroupMessageState,
  type GraphViewPrimaryMessageContext,
} from '../../../../../src/extension/graphView/webview/dispatch/primary';

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
    setFocusedFile: vi.fn(),
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
    resetTimeline: vi.fn(() => Promise.resolve()),
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

describe('createGraphViewPrimaryGroupMessageState', () => {
  it('seeds user groups from the primary message context', () => {
    const groups: IGroup[] = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];
    const context = createContext({
      getUserGroups: vi.fn(() => groups),
    });

    expect(createGraphViewPrimaryGroupMessageState(context)).toEqual({
      userGroups: groups,
    });
  });
});
