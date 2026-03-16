import { describe, expect, it, vi } from 'vitest';
import type { IGraphData, IGroup } from '../../../../../src/shared/types';
import type { IViewContext } from '../../../../../src/core/views';

const exportSaverMocks = vi.hoisted(() => ({
  savePng: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../../src/extension/export/savePng', () => ({
  saveExportedPng: exportSaverMocks.savePng,
}));

import {
  dispatchGraphViewPrimaryMessage,
  type GraphViewPrimaryMessageContext,
} from '../../../../../src/extension/graphView/messages/dispatch/primary';

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

describe('graph view primary message dispatch', () => {
  it('returns handled for node/file messages before later handlers run', async () => {
    const context = createContext();

    await expect(
      dispatchGraphViewPrimaryMessage({ type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } }, context),
    ).resolves.toEqual({ handled: true });

    expect(context.openSelectedNode).toHaveBeenCalledWith('src/app.ts');
    expect(context.updateDagMode).not.toHaveBeenCalled();
  });

  it('routes export messages through the live export saver handlers', async () => {
    const context = createContext();

    await expect(
      dispatchGraphViewPrimaryMessage(
        {
          type: 'EXPORT_PNG',
          payload: { dataUrl: 'data:image/png;base64,abc', filename: 'graph.png' },
        },
        context,
      ),
    ).resolves.toEqual({ handled: true });

    expect(exportSaverMocks.savePng).toHaveBeenCalledWith('data:image/png;base64,abc', 'graph.png');
    expect(context.updateDagMode).not.toHaveBeenCalled();
  });

  it('returns handled for command messages before timeline handlers run', async () => {
    const context = createContext();

    await expect(
      dispatchGraphViewPrimaryMessage(
        { type: 'UPDATE_DAG_MODE', payload: { dagMode: 'TB' } },
        context,
      ),
    ).resolves.toEqual({ handled: true });

    expect(context.updateDagMode).toHaveBeenCalledWith('TB');
    expect(context.indexRepository).not.toHaveBeenCalled();
  });

  it('returns handled for timeline messages before physics handlers run', async () => {
    const context = createContext();

    await expect(dispatchGraphViewPrimaryMessage({ type: 'INDEX_REPO' }, context)).resolves.toEqual({
      handled: true,
    });

    expect(context.indexRepository).toHaveBeenCalledOnce();
    expect(context.sendPhysicsSettings).not.toHaveBeenCalled();
  });

  it('returns handled for physics messages', async () => {
    const context = createContext();

    await expect(
      dispatchGraphViewPrimaryMessage({ type: 'GET_PHYSICS_SETTINGS' }, context),
    ).resolves.toEqual({ handled: true });

    expect(context.sendPhysicsSettings).toHaveBeenCalledOnce();
  });

  it('persists updated user groups returned by the group message handler', async () => {
    const incomingGroups: IGroup[] = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];
    const context = createContext({
      getUserGroups: vi.fn(() => incomingGroups),
    });

    const result = await dispatchGraphViewPrimaryMessage(
      { type: 'UPDATE_GROUPS', payload: { groups: incomingGroups } },
      context,
    );

    expect(result).toEqual({
      handled: true,
      userGroups: incomingGroups,
    });
    expect(context.persistGroups).toHaveBeenCalledWith(incomingGroups);
    expect(context.recomputeGroups).toHaveBeenCalledOnce();
    expect(context.sendGroupsUpdated).toHaveBeenCalledOnce();
  });

  it('returns updated filter patterns from settings messages', async () => {
    const context = createContext({
      getFilterPatterns: vi.fn(() => []),
      getPluginFilterPatterns: vi.fn(() => ['venv/**']),
    });

    const result = await dispatchGraphViewPrimaryMessage(
      { type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: ['dist/**'] } },
      context,
    );

    expect(result).toEqual({
      handled: true,
      filterPatterns: ['dist/**'],
    });
    expect(context.updateConfig).toHaveBeenCalledWith('filterPatterns', ['dist/**']);
    expect(context.sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['dist/**'],
        pluginPatterns: ['venv/**'],
      },
    });
  });

  it('returns false when no primary message family handles the input', async () => {
    await expect(
      dispatchGraphViewPrimaryMessage({ type: 'WEBVIEW_READY' }, createContext()),
    ).resolves.toEqual({ handled: false });
  });
});
