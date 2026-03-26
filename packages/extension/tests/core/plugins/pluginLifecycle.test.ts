import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializeAll,
  initializePlugin,
  notifyWorkspaceReady,
  notifyPreAnalyze,
  notifyPostAnalyze,
  notifyGraphRebuild,
  notifyWebviewReady,
  notifyWorkspaceReadyForPlugin,
  notifyWebviewReadyForPlugin,
  replayReadinessForPlugin,
} from '../../../src/core/plugins/pluginLifecycle';
import type { IPlugin } from '../../../src/core/plugins/types';
import type { IGraphData } from '../../../src/shared/contracts';

const emptyGraph: IGraphData = { nodes: [], edges: [] };

function makePlugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.ts'],
    detectConnections: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
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

      expect(initialize).toHaveBeenCalledWith('/ws');
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

      await expect(initializePlugin(info, '/ws', initialized)).resolves.toBeUndefined();
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

      expect(initA).toHaveBeenCalledWith('/ws');
      expect(initB).toHaveBeenCalledWith('/ws');
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

      expect(onPreAnalyze).toHaveBeenCalledWith(files, '/ws');
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

  describe('notifyWebviewReady', () => {
    it('calls onWebviewReady for each plugin', () => {
      const onWebviewReady = vi.fn();
      const plugin = makePlugin({ onWebviewReady });
      const plugins = makePluginsMap(plugin);

      notifyWebviewReady(plugins);

      expect(onWebviewReady).toHaveBeenCalled();
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

  describe('notifyWebviewReadyForPlugin', () => {
    it('calls onWebviewReady on the plugin', () => {
      const onWebviewReady = vi.fn();
      const plugin = makePlugin({ onWebviewReady });

      notifyWebviewReadyForPlugin({ plugin });

      expect(onWebviewReady).toHaveBeenCalled();
    });

    it('handles plugins that throw from onWebviewReady', () => {
      const onWebviewReady = vi.fn().mockImplementation(() => { throw new Error('crash'); });
      const plugin = makePlugin({ onWebviewReady });

      expect(() => notifyWebviewReadyForPlugin({ plugin })).not.toThrow();
    });
  });

  describe('replayReadinessForPlugin', () => {
    let onWorkspaceReady: ReturnType<typeof vi.fn>;
    let onWebviewReady: ReturnType<typeof vi.fn>;
    let info: { plugin: IPlugin };

    beforeEach(() => {
      onWorkspaceReady = vi.fn();
      onWebviewReady = vi.fn();
      const plugin = makePlugin({ onWorkspaceReady, onWebviewReady });
      info = { plugin };
    });

    it('replays workspace-ready when workspace was previously notified', () => {
      replayReadinessForPlugin(info, true, emptyGraph, false);

      expect(onWorkspaceReady).toHaveBeenCalledWith(emptyGraph);
      expect(onWebviewReady).not.toHaveBeenCalled();
    });

    it('replays webview-ready when webview was previously notified', () => {
      replayReadinessForPlugin(info, false, undefined, true);

      expect(onWorkspaceReady).not.toHaveBeenCalled();
      expect(onWebviewReady).toHaveBeenCalled();
    });

    it('skips replay when nothing has been notified yet', () => {
      replayReadinessForPlugin(info, false, undefined, false);

      expect(onWorkspaceReady).not.toHaveBeenCalled();
      expect(onWebviewReady).not.toHaveBeenCalled();
    });

    it('replays both when both have been notified', () => {
      replayReadinessForPlugin(info, true, emptyGraph, true);

      expect(onWorkspaceReady).toHaveBeenCalled();
      expect(onWebviewReady).toHaveBeenCalled();
    });
  });
});
