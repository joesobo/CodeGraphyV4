import { describe, it, expect, vi } from 'vitest';
import {
  initializeAll,
  initializePlugin,
  notifyWorkspaceReady,
  notifyPreAnalyze,
  notifyPostAnalyze,
  notifyGraphRebuild,
  notifyWebviewReady,
  replayReadinessForPlugin,
  notifyWorkspaceReadyForPlugin,
  notifyWebviewReadyForPlugin,
  IReadinessState,
  IPluginInfoWithApi,
} from '@/core/plugins/pluginLifecycle';
import { IPlugin } from '@/core/plugins/types';
import { IGraphData } from '@/shared/types';

function createMockPlugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'test.plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.ts'],
    detectConnections: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createInfo(plugin: IPlugin): IPluginInfoWithApi {
  return { plugin, builtIn: false };
}

function createGraph(): IGraphData {
  return { nodes: [], edges: [] };
}

function createState(overrides: Partial<IReadinessState> = {}): IReadinessState {
  return {
    workspaceReadyNotified: false,
    webviewReadyNotified: false,
    ...overrides,
  };
}

describe('initializePlugin', () => {
  it('calls initialize on a plugin that has not been initialized', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const plugin = createMockPlugin({ initialize });
    const info = createInfo(plugin);
    const initialized = new Set<string>();

    await initializePlugin(info, initialized, '/workspace');

    expect(initialize).toHaveBeenCalledWith('/workspace');
  });

  it('skips initialization for a plugin that was already initialized', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const plugin = createMockPlugin({ initialize });
    const info = createInfo(plugin);
    const initialized = new Set<string>([plugin.id]);

    await initializePlugin(info, initialized, '/workspace');

    expect(initialize).not.toHaveBeenCalled();
  });

  it('removes the plugin from initialized set when initialize throws', async () => {
    const initialize = vi.fn().mockRejectedValue(new Error('Init failed'));
    const plugin = createMockPlugin({ initialize });
    const info = createInfo(plugin);
    const initialized = new Set<string>();

    await initializePlugin(info, initialized, '/workspace');

    expect(initialized.has(plugin.id)).toBe(false);
  });

  it('does not throw when a plugin has no initialize method', async () => {
    const plugin = createMockPlugin({ initialize: undefined });
    const info = createInfo(plugin);
    const initialized = new Set<string>();

    await expect(initializePlugin(info, initialized, '/workspace')).resolves.toBeUndefined();
  });
});

describe('initializeAll', () => {
  it('initializes all plugins in the map', async () => {
    const init1 = vi.fn().mockResolvedValue(undefined);
    const init2 = vi.fn().mockResolvedValue(undefined);
    const plugin1 = createMockPlugin({ id: 'plugin.one', initialize: init1 });
    const plugin2 = createMockPlugin({ id: 'plugin.two', initialize: init2 });
    const pluginsMap = new Map<string, IPluginInfoWithApi>([
      [plugin1.id, createInfo(plugin1)],
      [plugin2.id, createInfo(plugin2)],
    ]);
    const initialized = new Set<string>();

    await initializeAll(pluginsMap, initialized, '/workspace');

    expect(init1).toHaveBeenCalledWith('/workspace');
    expect(init2).toHaveBeenCalledWith('/workspace');
  });

  it('continues initialization of remaining plugins when one fails', async () => {
    const init1 = vi.fn().mockRejectedValue(new Error('Failed'));
    const init2 = vi.fn().mockResolvedValue(undefined);
    const plugin1 = createMockPlugin({ id: 'plugin.one', initialize: init1 });
    const plugin2 = createMockPlugin({ id: 'plugin.two', initialize: init2 });
    const pluginsMap = new Map<string, IPluginInfoWithApi>([
      [plugin1.id, createInfo(plugin1)],
      [plugin2.id, createInfo(plugin2)],
    ]);

    await initializeAll(pluginsMap, new Set(), '/workspace');

    expect(init2).toHaveBeenCalled();
  });
});

describe('notifyWorkspaceReady', () => {
  it('calls onWorkspaceReady on all plugins', () => {
    const onWorkspaceReady = vi.fn();
    const plugin = createMockPlugin({ onWorkspaceReady });
    const pluginsMap = new Map([[plugin.id, createInfo(plugin)]]);
    const state = createState();
    const graph = createGraph();

    notifyWorkspaceReady(pluginsMap, state, graph);

    expect(onWorkspaceReady).toHaveBeenCalledWith(graph);
  });

  it('marks the state as workspace-ready-notified', () => {
    const pluginsMap = new Map<string, IPluginInfoWithApi>();
    const state = createState();

    notifyWorkspaceReady(pluginsMap, state, createGraph());

    expect(state.workspaceReadyNotified).toBe(true);
  });

  it('stores the last workspace-ready graph in state', () => {
    const pluginsMap = new Map<string, IPluginInfoWithApi>();
    const state = createState();
    const graph = createGraph();

    notifyWorkspaceReady(pluginsMap, state, graph);

    expect(state.lastWorkspaceReadyGraph).toBe(graph);
  });

  it('does not throw when a plugin onWorkspaceReady throws', () => {
    const plugin = createMockPlugin({ onWorkspaceReady: vi.fn().mockImplementation(() => { throw new Error('fail'); }) });
    const pluginsMap = new Map([[plugin.id, createInfo(plugin)]]);

    expect(() => notifyWorkspaceReady(pluginsMap, createState(), createGraph())).not.toThrow();
  });
});

describe('notifyPreAnalyze', () => {
  it('calls onPreAnalyze on plugins that have it', async () => {
    const onPreAnalyze = vi.fn().mockResolvedValue(undefined);
    const plugin = createMockPlugin({ onPreAnalyze });
    const pluginsMap = new Map([[plugin.id, createInfo(plugin)]]);

    await notifyPreAnalyze(pluginsMap, [], '/workspace');

    expect(onPreAnalyze).toHaveBeenCalledWith([], '/workspace');
  });

  it('skips plugins that do not have onPreAnalyze', async () => {
    const plugin = createMockPlugin({ onPreAnalyze: undefined });
    const pluginsMap = new Map([[plugin.id, createInfo(plugin)]]);

    await expect(notifyPreAnalyze(pluginsMap, [], '/workspace')).resolves.toBeUndefined();
  });

  it('continues notifying remaining plugins when one onPreAnalyze throws', async () => {
    const onPreAnalyze1 = vi.fn().mockRejectedValue(new Error('fail'));
    const onPreAnalyze2 = vi.fn().mockResolvedValue(undefined);
    const plugin1 = createMockPlugin({ id: 'one', onPreAnalyze: onPreAnalyze1 });
    const plugin2 = createMockPlugin({ id: 'two', onPreAnalyze: onPreAnalyze2 });
    const pluginsMap = new Map([
      [plugin1.id, createInfo(plugin1)],
      [plugin2.id, createInfo(plugin2)],
    ]);

    await notifyPreAnalyze(pluginsMap, [], '/workspace');

    expect(onPreAnalyze2).toHaveBeenCalled();
  });
});

describe('notifyPostAnalyze', () => {
  it('calls onPostAnalyze on plugins that have it', () => {
    const onPostAnalyze = vi.fn();
    const plugin = createMockPlugin({ onPostAnalyze });
    const pluginsMap = new Map([[plugin.id, createInfo(plugin)]]);
    const graph = createGraph();

    notifyPostAnalyze(pluginsMap, createState(), graph);

    expect(onPostAnalyze).toHaveBeenCalledWith(graph);
  });

  it('updates lastWorkspaceReadyGraph in state', () => {
    const pluginsMap = new Map<string, IPluginInfoWithApi>();
    const state = createState();
    const graph = createGraph();

    notifyPostAnalyze(pluginsMap, state, graph);

    expect(state.lastWorkspaceReadyGraph).toBe(graph);
  });
});

describe('notifyGraphRebuild', () => {
  it('calls onGraphRebuild on plugins that have it', () => {
    const onGraphRebuild = vi.fn();
    const plugin = createMockPlugin({ onGraphRebuild });
    const pluginsMap = new Map([[plugin.id, createInfo(plugin)]]);
    const graph = createGraph();

    notifyGraphRebuild(pluginsMap, createState(), graph);

    expect(onGraphRebuild).toHaveBeenCalledWith(graph);
  });

  it('updates lastWorkspaceReadyGraph in state', () => {
    const pluginsMap = new Map<string, IPluginInfoWithApi>();
    const state = createState();
    const graph = createGraph();

    notifyGraphRebuild(pluginsMap, state, graph);

    expect(state.lastWorkspaceReadyGraph).toBe(graph);
  });
});

describe('notifyWebviewReady', () => {
  it('calls onWebviewReady on plugins that have it', () => {
    const onWebviewReady = vi.fn();
    const plugin = createMockPlugin({ onWebviewReady });
    const pluginsMap = new Map([[plugin.id, createInfo(plugin)]]);
    const state = createState();

    notifyWebviewReady(pluginsMap, state);

    expect(onWebviewReady).toHaveBeenCalled();
  });

  it('marks the state as webview-ready-notified', () => {
    const pluginsMap = new Map<string, IPluginInfoWithApi>();
    const state = createState();

    notifyWebviewReady(pluginsMap, state);

    expect(state.webviewReadyNotified).toBe(true);
  });
});

describe('replayReadinessForPlugin', () => {
  it('replays workspace-ready notification when workspace was already notified', () => {
    const onWorkspaceReady = vi.fn();
    const plugin = createMockPlugin({ onWorkspaceReady });
    const info = createInfo(plugin);
    const graph = createGraph();
    const state = createState({ workspaceReadyNotified: true, lastWorkspaceReadyGraph: graph });

    replayReadinessForPlugin(info, state);

    expect(onWorkspaceReady).toHaveBeenCalledWith(graph);
  });

  it('does not replay workspace-ready notification when workspace was not yet notified', () => {
    const onWorkspaceReady = vi.fn();
    const plugin = createMockPlugin({ onWorkspaceReady });
    const info = createInfo(plugin);
    const state = createState({ workspaceReadyNotified: false });

    replayReadinessForPlugin(info, state);

    expect(onWorkspaceReady).not.toHaveBeenCalled();
  });

  it('replays webview-ready notification when webview was already notified', () => {
    const onWebviewReady = vi.fn();
    const plugin = createMockPlugin({ onWebviewReady });
    const info = createInfo(plugin);
    const state = createState({ webviewReadyNotified: true });

    replayReadinessForPlugin(info, state);

    expect(onWebviewReady).toHaveBeenCalled();
  });

  it('does not replay webview-ready notification when webview was not yet notified', () => {
    const onWebviewReady = vi.fn();
    const plugin = createMockPlugin({ onWebviewReady });
    const info = createInfo(plugin);
    const state = createState({ webviewReadyNotified: false });

    replayReadinessForPlugin(info, state);

    expect(onWebviewReady).not.toHaveBeenCalled();
  });
});

describe('notifyWorkspaceReadyForPlugin', () => {
  it('calls onWorkspaceReady with the graph', () => {
    const onWorkspaceReady = vi.fn();
    const plugin = createMockPlugin({ onWorkspaceReady });
    const info = createInfo(plugin);
    const graph = createGraph();

    notifyWorkspaceReadyForPlugin(info, graph);

    expect(onWorkspaceReady).toHaveBeenCalledWith(graph);
  });

  it('does not throw when the plugin has no onWorkspaceReady', () => {
    const info = createInfo(createMockPlugin({ onWorkspaceReady: undefined }));

    expect(() => notifyWorkspaceReadyForPlugin(info, createGraph())).not.toThrow();
  });
});

describe('notifyWebviewReadyForPlugin', () => {
  it('calls onWebviewReady', () => {
    const onWebviewReady = vi.fn();
    const plugin = createMockPlugin({ onWebviewReady });
    const info = createInfo(plugin);

    notifyWebviewReadyForPlugin(info);

    expect(onWebviewReady).toHaveBeenCalled();
  });

  it('does not throw when the plugin has no onWebviewReady', () => {
    const info = createInfo(createMockPlugin({ onWebviewReady: undefined }));

    expect(() => notifyWebviewReadyForPlugin(info)).not.toThrow();
  });
});
