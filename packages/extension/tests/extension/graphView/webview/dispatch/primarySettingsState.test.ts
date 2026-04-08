import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '@/shared/graph/types';
import {
  createGraphViewPrimarySettingsMessageState,
} from '../../../../../src/extension/graphView/webview/dispatch/primaryState';
import type { GraphViewPrimaryMessageContext } from '../../../../../src/extension/graphView/webview/dispatch/primary';

function createContext(
  overrides: Partial<GraphViewPrimaryMessageContext> = {},
): GraphViewPrimaryMessageContext {
  const context = {
    getTimelineActive: vi.fn(() => false),
    getCurrentCommitSha: vi.fn(() => undefined),
    getUserGroups: vi.fn(() => []),
    getActiveViewId: vi.fn(() => 'codegraphy.connections'),
    getDisabledPlugins: vi.fn(() => new Set<string>()),
    getDisabledRules: vi.fn(() => new Set<string>()),
    getFilterPatterns: vi.fn(() => []),
    getGraphData: vi.fn(() => ({ nodes: [], edges: [] } satisfies IGraphData)),
    getViewContext: vi.fn(() => ({ activePlugins: new Set() })),
    sendGraphControls: vi.fn(),
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

  context.sendGraphControls ??= vi.fn();

  return context as GraphViewPrimaryMessageContext;
}

describe('createGraphViewPrimarySettingsMessageState', () => {
  it('reads the current settings state from the primary message context', () => {
    const disabledPlugins = new Set(['plugin-a']);
    const disabledSources = new Set(['rule-a']);
    const graphData = { nodes: [], edges: [] } satisfies IGraphData;
    const context = createContext({
      getDisabledPlugins: vi.fn(() => disabledPlugins),
      getDisabledRules: vi.fn(() => disabledSources),
      getFilterPatterns: vi.fn(() => ['dist/**']),
      getGraphData: vi.fn(() => graphData),
    });

    expect(createGraphViewPrimarySettingsMessageState(context)).toEqual({
      disabledPlugins,
      disabledSources,
      filterPatterns: ['dist/**'],
      graphData,
    });
  });
});
