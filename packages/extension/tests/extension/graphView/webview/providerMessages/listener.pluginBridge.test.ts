import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetListenerMocks } from './listener.fixture';
import { loadDefaultListenerHarness } from './listenerDefaultHarness';

afterEach(resetListenerMocks);

describe('graph view provider listener plugin bridges', () => {
  it('reprocesses plugin-owned files with a scoped refresh when invalidated files are known', async () => {
    const { context, source } = await loadDefaultListenerHarness({
      invalidatePluginFiles: vi.fn(() => ['src/plugin.py']),
    });

    await context.reprocessPluginFiles(['codegraphy.vue']);

    expect(source.invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(source.refreshChangedFiles).toHaveBeenCalledWith(['src/plugin.py']);
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
  }, 15_000);

  it('skips a full reanalysis when plugin-owned invalidation reports no concrete files', async () => {
    const { context, source } = await loadDefaultListenerHarness({
      invalidatePluginFiles: vi.fn(() => []),
    });

    await context.reprocessPluginFiles(['codegraphy.vue']);

    expect(source.invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(source.refreshChangedFiles).not.toHaveBeenCalled();
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
  }, 15_000);


  it('wires read-context values into the captured listener context', async () => {
    const { context, source, workspaceFolders } = await loadDefaultListenerHarness();

    expect(context.workspaceFolder).toEqual(workspaceFolders[0]);
    expect(context.getUserGroups()).toEqual([]);
    expect(context.getFilterPatterns()).toEqual(['dist/**']);
    expect(context.findNode('node-1')).toEqual(source._graphData.nodes[0]);
    expect(context.findEdge('edge-1')).toEqual(source._graphData.edges[0]);
  }, 15_000);

  it('wires plugin-context bridges into the captured listener context', async () => {
    const { context, source } = await loadDefaultListenerHarness();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(context.getPluginFilterPatterns()).toEqual(['plugin/**']);
    expect(context.hasWorkspace()).toBe(true);
    expect(context.isFirstAnalysis()).toBe(false);
    expect(context.isWebviewReadyNotified()).toBe(false);

    context.loadGroupsAndFilterPatterns();
    context.loadDisabledRulesAndPlugins();
    context.sendFavorites();
    context.sendSettings();
    context.sendDecorations();
    context.sendContextMenuItems();
    context.sendPluginWebviewInjections();
    await context.waitForFirstWorkspaceReady();
    context.notifyWebviewReady();
    context.emitEvent('plugin:ready', { id: 'plugin.test' });
    context.logError('listener failed', new Error('boom'));
    context.setUserGroups([{ id: 'user:src', pattern: 'src/**', color: '#112233' }]);
    context.setFilterPatterns(['src/**']);
    context.setWebviewReadyNotified(true);

    expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(source._sendFavorites).toHaveBeenCalledOnce();
    expect(source._sendSettings).toHaveBeenCalledOnce();
    expect(source._sendDecorations).toHaveBeenCalledOnce();
    expect(source._sendContextMenuItems).toHaveBeenCalledOnce();
    expect(source._sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(source._analyzer?.registry?.notifyWebviewReady).toHaveBeenCalledOnce();
    expect(source._eventBus.emit).toHaveBeenCalledWith('plugin:ready', { id: 'plugin.test' });
    expect(source._userGroups).toEqual([
      { id: 'user:src', pattern: 'src/**', color: '#112233' },
    ]);
    expect(source._filterPatterns).toEqual(['src/**']);
    expect(source._webviewReadyNotified).toBe(true);

    consoleError.mockRestore();
  }, 15_000);
});
