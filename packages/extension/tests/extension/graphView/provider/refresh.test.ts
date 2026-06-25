import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderRefreshMethods } from '../../../../src/extension/graphView/provider/refresh';
import { createSource } from './refresh/fixture';

describe('graphView/provider/refresh', () => {
  describe('refresh', () => {

    it('refresh reloads disabled settings and group state before reloading graph data', async () => {
      const source = createSource();
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      await methods.refresh();

      expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
      expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
      expect(source._loadAndSendData).toHaveBeenCalledOnce();
      expect(source._analyzeAndSendData).not.toHaveBeenCalled();
    });



    it('refresh resends the full settings snapshot after re-analysis', async () => {
      const source = createSource();
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      await methods.refresh();

      expect(source._sendAllSettings).toHaveBeenCalledOnce();
      expect(source._sendSettings).not.toHaveBeenCalled();
      expect(source._sendPhysicsSettings).not.toHaveBeenCalled();
    });



    it('refresh does not resend favorites after re-analysis', async () => {
      const source = createSource();
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      await methods.refresh();

      expect(source._sendFavorites).not.toHaveBeenCalled();
    });



  });

  describe('refreshIndex', () => {
    it('refreshIndex uses the explicit reindex path when available', async () => {
      const refreshAndSendData = vi.fn(async () => undefined);
      const source = createSource({
        _refreshAndSendData: refreshAndSendData,
      });
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      await methods.refreshIndex();

      expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
      expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
      expect(refreshAndSendData).toHaveBeenCalledOnce();
      expect(source._analyzeAndSendData).not.toHaveBeenCalled();
      expect(source._sendAllSettings).toHaveBeenCalledOnce();
      expect(source._sendFavorites).not.toHaveBeenCalled();
    });



    it('queues changed-file refreshes while a full index refresh is running', async () => {
      let finishRefreshIndex: (() => void) | undefined;
      const refreshAndSendData = vi.fn(async () => {
        await new Promise<void>(resolve => {
          finishRefreshIndex = resolve;
        });
      });
      const incrementalAnalyzeAndSendData = vi.fn(async () => undefined);
      const source = createSource({
        _refreshAndSendData: refreshAndSendData,
        _incrementalAnalyzeAndSendData: incrementalAnalyzeAndSendData,
      });
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      const refreshIndex = methods.refreshIndex();
      await Promise.resolve();
      const changedFiles = methods.refreshChangedFiles(['src/branch.ts']);

      expect(incrementalAnalyzeAndSendData).not.toHaveBeenCalled();

      finishRefreshIndex?.();
      await refreshIndex;
      await changedFiles;

      expect(incrementalAnalyzeAndSendData).toHaveBeenCalledWith(['src/branch.ts']);
    });



    it('prevents normal graph refreshes from interrupting a full index refresh', async () => {
      let finishRefreshIndex: (() => void) | undefined;
      const refreshAndSendData = vi.fn(async () => {
        await new Promise<void>(resolve => {
          finishRefreshIndex = resolve;
        });
      });
      const loadAndSendData = vi.fn(async () => undefined);
      const source = createSource({
        _refreshAndSendData: refreshAndSendData,
        _loadAndSendData: loadAndSendData,
      });
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      const refreshIndex = methods.refreshIndex();
      await Promise.resolve();
      const refresh = methods.refresh();

      expect(loadAndSendData).not.toHaveBeenCalled();

      finishRefreshIndex?.();
      await refreshIndex;
      await refresh;

      expect(refreshAndSendData).toHaveBeenCalledOnce();
      expect(loadAndSendData).not.toHaveBeenCalled();
    });



  });

  describe('refreshChangedFiles', () => {
    it('uses indexed incremental analysis without replaying full settings state', async () => {
      const source = createSource();
      const methods = createGraphViewProviderRefreshMethods(source as never, {
        getShowOrphans: vi.fn(() => true),
        rebuildGraphData: vi.fn(),
        smartRebuildGraphData: vi.fn(),
      });

      await methods.refreshChangedFiles(['src/example.ts']);

      expect(source._loadDisabledRulesAndPlugins).not.toHaveBeenCalled();
      expect(source._loadGroupsAndFilterPatterns).not.toHaveBeenCalled();
      expect(source._incrementalAnalyzeAndSendData).toHaveBeenCalledWith(['src/example.ts']);
      expect(source._sendAllSettings).not.toHaveBeenCalled();
      expect(source._sendGraphControls).not.toHaveBeenCalled();
    });
  });

});
