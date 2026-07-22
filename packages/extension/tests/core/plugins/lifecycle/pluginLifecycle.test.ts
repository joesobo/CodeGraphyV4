import { describe, expect, it, vi } from 'vitest';
import {
  notifyFilesChanged,
} from '../../../../src/core/plugins/lifecycle/notify/filesChanged';
import {
  notifyGraphRebuild,
  notifyPostAnalyze,
  notifyPreAnalyze,
} from '../../../../src/core/plugins/lifecycle/notify/analysis';
import { notifyWorkspaceReadyForPlugin, notifyWorkspaceReady } from '../../../../src/core/plugins/lifecycle/notify/readiness';
import { initializeAll, initializePlugin } from '../../../../src/core/plugins/lifecycle/initialize';
import { replayReadinessForPlugin } from '../../../../src/core/plugins/lifecycle/replay';
import type { IPlugin } from '../../../../src/core/plugins/types/contracts';
import type { IGraphData } from '../../../../src/shared/graph/contracts';

const emptyGraph: IGraphData = { nodes: [], edges: [] };

function makePlugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: ['.ts'],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
    ...overrides,
  } as IPlugin;
}

function makePluginsMap(plugin: IPlugin): Map<string, { plugin: IPlugin }> {
  return new Map([[plugin.id, { plugin }]]);
}

describe('pluginLifecycle', () => {
  describe('initializePlugin', () => {
    it('calls initialize on a plugin that has not been initialized', async () => {
      const initialize = vi.fn().mockResolvedValue(undefined);
      const plugin = makePlugin({ initialize });
      const info = { plugin };
      const initialized = new Set<string>();

      await initializePlugin(info, '/ws', initialized);

      expect(initialize).toHaveBeenCalledWith(
        '/ws',
        expect.objectContaining({ fileSystem: expect.any(Object) }),
      );
      expect(initialized.has(plugin.id)).toBe(true);
    });

    it('does not call initialize a second time', async () => {
      const initialize = vi.fn().mockResolvedValue(undefined);
      const plugin = makePlugin({ initialize });
      const info = { plugin };
      const initialized = new Set<string>([plugin.id]);

      await initializePlugin(info, '/ws', initialized);

      expect(initialize).not.toHaveBeenCalled();
    });

    it('removes plugin from initialized set when initialize throws', async () => {
      const initialize = vi.fn().mockRejectedValue(new Error('boom'));
      const plugin = makePlugin({ initialize });
      const info = { plugin };
      const initialized = new Set<string>();

      await initializePlugin(info, '/ws', initialized);

      expect(initialized.has(plugin.id)).toBe(false);
    });

    it('skips plugins without an initialize method', async () => {
      const plugin = makePlugin();
      const info = { plugin };
      const initialized = new Set<string>();

      await expect(initializePlugin(info, '/ws', initialized)).resolves.toBe(true);
      expect(initialized.has(plugin.id)).toBe(true);
    });
  });

  describe('initializeAll', () => {
    it('initializes all plugins in the map', async () => {
      const initA = vi.fn().mockResolvedValue(undefined);
      const initB = vi.fn().mockResolvedValue(undefined);
      const pluginA = makePlugin({ id: 'plugin-a', initialize: initA });
      const pluginB = makePlugin({ id: 'plugin-b', initialize: initB });
      const plugins = new Map([
        ['plugin-a', { plugin: pluginA }],
        ['plugin-b', { plugin: pluginB }],
      ]);
      const initialized = new Set<string>();

      await initializeAll(plugins, '/ws', initialized);

      expect(initA).toHaveBeenCalledWith(
        '/ws',
        expect.objectContaining({ fileSystem: expect.any(Object) }),
      );
      expect(initB).toHaveBeenCalledWith(
        '/ws',
        expect.objectContaining({ fileSystem: expect.any(Object) }),
      );
    });
  });

  describe('notifyWorkspaceReady', () => {
    it('calls onWorkspaceReady for each plugin', () => {
      const onWorkspaceReady = vi.fn();
      const plugin = makePlugin({ onWorkspaceReady });
      const plugins = makePluginsMap(plugin);

      notifyWorkspaceReady(plugins, emptyGraph);

      expect(onWorkspaceReady).toHaveBeenCalledWith(emptyGraph);
    });

    it('skips plugins without onWorkspaceReady', () => {
      const plugin = makePlugin();
      const plugins = makePluginsMap(plugin);

      expect(() => notifyWorkspaceReady(plugins, emptyGraph)).not.toThrow();
    });
  });

  describe('notifyPreAnalyze', () => {
    it('calls onPreAnalyze for each plugin', async () => {
      const onPreAnalyze = vi.fn().mockResolvedValue(undefined);
      const plugin = makePlugin({ onPreAnalyze });
      const plugins = makePluginsMap(plugin);
      const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];

      await notifyPreAnalyze(plugins, files, '/ws');

      expect(onPreAnalyze).toHaveBeenCalledWith(
        files,
        '/ws',
        expect.objectContaining({ fileSystem: expect.any(Object) }),
      );
    });
  });

  describe('notifyFilesChanged', () => {
    it('collects additional workspace-relative files requested by plugins', async () => {
      const onFilesChanged = vi.fn().mockResolvedValue(['src/dependency.ts', 'src/dependency.ts']);
      const plugin = makePlugin({ onFilesChanged });
      const plugins = makePluginsMap(plugin);
      const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];

      await expect(notifyFilesChanged(plugins, files, '/ws')).resolves.toEqual({
        additionalFilePaths: ['src/dependency.ts'],
        requiresFullRefresh: false,
      });
      expect(onFilesChanged).toHaveBeenCalledWith(
        files,
        '/ws',
        expect.objectContaining({ fileSystem: expect.any(Object) }),
      );
    });

    it('requests a full refresh when a matching plugin still only supports pre-analysis hooks', async () => {
      const onPreAnalyze = vi.fn().mockResolvedValue(undefined);
      const plugin = makePlugin({ onPreAnalyze });
      const plugins = makePluginsMap(plugin);
      const files = [{ absolutePath: '/ws/a.ts', relativePath: 'a.ts', content: '' }];

      await expect(notifyFilesChanged(plugins, files, '/ws')).resolves.toEqual({
        additionalFilePaths: [],
        requiresFullRefresh: true,
      });
    });
  });

  describe('notifyPostAnalyze', () => {
    it('calls onPostAnalyze for each plugin', () => {
      const onPostAnalyze = vi.fn();
      const plugin = makePlugin({ onPostAnalyze });
      const plugins = makePluginsMap(plugin);

      notifyPostAnalyze(plugins, emptyGraph);

      expect(onPostAnalyze).toHaveBeenCalledWith(emptyGraph);
    });
  });

  describe('notifyGraphRebuild', () => {
    it('calls onGraphRebuild for each plugin', () => {
      const onGraphRebuild = vi.fn();
      const plugin = makePlugin({ onGraphRebuild });
      const plugins = makePluginsMap(plugin);

      notifyGraphRebuild(plugins, emptyGraph);

      expect(onGraphRebuild).toHaveBeenCalledWith(emptyGraph);
    });
  });

  describe('notifyWorkspaceReadyForPlugin', () => {
    it('calls onWorkspaceReady on the plugin', () => {
      const onWorkspaceReady = vi.fn();
      const plugin = makePlugin({ onWorkspaceReady });

      notifyWorkspaceReadyForPlugin({ plugin }, emptyGraph);

      expect(onWorkspaceReady).toHaveBeenCalledWith(emptyGraph);
    });

    it('handles plugins that throw from onWorkspaceReady', () => {
      const onWorkspaceReady = vi.fn().mockImplementation(() => { throw new Error('crash'); });
      const plugin = makePlugin({ onWorkspaceReady });

      expect(() => notifyWorkspaceReadyForPlugin({ plugin }, emptyGraph)).not.toThrow();
    });
  });

  describe('replayReadinessForPlugin', () => {
    it('replays workspace-ready when workspace was previously notified', () => {
      const onWorkspaceReady = vi.fn();
      const info = { plugin: makePlugin({ onWorkspaceReady }) };
      replayReadinessForPlugin(info, true, emptyGraph);

      expect(onWorkspaceReady).toHaveBeenCalledWith(emptyGraph);
    });

    it('skips replay when nothing has been notified yet', () => {
      const onWorkspaceReady = vi.fn();
      const info = { plugin: makePlugin({ onWorkspaceReady }) };
      replayReadinessForPlugin(info, false, undefined);

      expect(onWorkspaceReady).not.toHaveBeenCalled();
    });
  });
});
