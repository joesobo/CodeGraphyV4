import { describe, it, expect, vi } from 'vitest';
import { CodeGraphyAPIImpl } from '@/core/plugins/codeGraphyApi';
import { EventBus } from '@/core/plugins/eventBus';
import { DecorationManager } from '@/core/plugins/decorationManager';
import { ViewRegistry } from '@/core/views/registry';
import { IGraphData } from '@/shared/contracts';
import { IView } from '@/core/views/types';

function createTestAPI(pluginId = 'test-plugin') {
  const eventBus = new EventBus();
  const decorationManager = new DecorationManager();
  const viewRegistry = new ViewRegistry();
  const graphData: IGraphData = {
    nodes: [
      { id: 'a.ts', label: 'a.ts', color: '#fff' },
      { id: 'b.ts', label: 'b.ts', color: '#fff' },
      { id: 'c.ts', label: 'c.ts', color: '#fff' },
    ],
    edges: [
      { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' },
      { id: 'b.ts->c.ts', from: 'b.ts', to: 'c.ts' },
    ],
  };
  const graphProvider = vi.fn(() => graphData);
  const commandRegistrar = vi.fn(() => ({ dispose: vi.fn() }));
  const webviewSender = vi.fn();
  const logFn = vi.fn();

  const api = new CodeGraphyAPIImpl(
    pluginId,
    eventBus,
    decorationManager,
    viewRegistry,
    graphProvider,
    commandRegistrar,
    webviewSender,
    '/workspace',
    logFn,
  );

  return {
    api,
    eventBus,
    decorationManager,
    viewRegistry,
    graphProvider,
    commandRegistrar,
    webviewSender,
    logFn,
    graphData,
  };
}

describe('CodeGraphyAPIImpl', () => {
  describe('version', () => {
    it('should expose version 2.0.0', () => {
      const { api } = createTestAPI();
      expect(api.version).toBe('2.0.0');
    });
  });

  describe('Events', () => {
    it('on() registers a handler that is triggered by emit', () => {
      const { api, eventBus } = createTestAPI();
      const handler = vi.fn();

      api.on('analysis:started', handler);
      eventBus.emit('analysis:started', { fileCount: 5 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ fileCount: 5 });
    });

    it('on() returns a disposable that unsubscribes the handler', () => {
      const { api, eventBus } = createTestAPI();
      const handler = vi.fn();

      const disposable = api.on('analysis:started', handler);
      disposable.dispose();
      eventBus.emit('analysis:started', { fileCount: 5 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('once() fires handler only once', () => {
      const { api, eventBus } = createTestAPI();
      const handler = vi.fn();

      api.once('analysis:started', handler);
      eventBus.emit('analysis:started', { fileCount: 1 });
      eventBus.emit('analysis:started', { fileCount: 2 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ fileCount: 1 });
    });

    it('once() returns a disposable that cancels before fire', () => {
      const { api, eventBus } = createTestAPI();
      const handler = vi.fn();

      const disposable = api.once('analysis:started', handler);
      disposable.dispose();
      eventBus.emit('analysis:started', { fileCount: 1 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('off() removes a specific handler', () => {
      const { api, eventBus } = createTestAPI();
      const handler = vi.fn();

      api.on('analysis:started', handler);
      api.off('analysis:started', handler);
      eventBus.emit('analysis:started', { fileCount: 1 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('registers handlers scoped to the plugin for auto-cleanup', () => {
      const { api, eventBus } = createTestAPI('my-plugin');
      const handler = vi.fn();

      api.on('analysis:started', handler);

      // removeAllForPlugin should clean up this handler
      eventBus.removeAllForPlugin('my-plugin');
      eventBus.emit('analysis:started', { fileCount: 1 });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Decorations', () => {
    it('decorateNode() adds a node decoration', () => {
      const { api, decorationManager } = createTestAPI();

      api.decorateNode('a.ts', { color: '#ff0000' });

      const merged = decorationManager.getMergedNodeDecorations();
      expect(merged.get('a.ts')).toEqual({ color: '#ff0000' });
    });

    it('decorateNode() returns a disposable that removes the decoration', () => {
      const { api, decorationManager } = createTestAPI();

      const disposable = api.decorateNode('a.ts', { color: '#ff0000' });
      disposable.dispose();

      const merged = decorationManager.getMergedNodeDecorations();
      expect(merged.has('a.ts')).toBe(false);
    });

    it('decorateEdge() adds an edge decoration', () => {
      const { api, decorationManager } = createTestAPI();

      api.decorateEdge('a.ts->b.ts', { color: '#00ff00', width: 3 });

      const merged = decorationManager.getMergedEdgeDecorations();
      expect(merged.get('a.ts->b.ts')).toEqual({ color: '#00ff00', width: 3 });
    });

    it('decorateEdge() returns a disposable that removes the decoration', () => {
      const { api, decorationManager } = createTestAPI();

      const disposable = api.decorateEdge('a.ts->b.ts', { color: '#00ff00' });
      disposable.dispose();

      const merged = decorationManager.getMergedEdgeDecorations();
      expect(merged.has('a.ts->b.ts')).toBe(false);
    });

    it('clearDecorations() clears all decorations for this plugin only', () => {
      const { api, decorationManager } = createTestAPI('plugin-a');

      // Add decoration from this plugin via the API
      api.decorateNode('a.ts', { color: '#ff0000' });

      // Add decoration from another plugin directly
      decorationManager.decorateNode('plugin-b', 'a.ts', { color: '#0000ff' });

      api.clearDecorations();

      const merged = decorationManager.getMergedNodeDecorations();
      // plugin-b's decoration should remain
      expect(merged.get('a.ts')).toEqual({ color: '#0000ff' });
    });
  });

  describe('Graph queries', () => {
    it('getGraph() returns the graph from the provider', () => {
      const { api, graphData } = createTestAPI();

      const result = api.getGraph();

      expect(result).toEqual(graphData);
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });

    it('getNode() finds a node by id', () => {
      const { api } = createTestAPI();

      const node = api.getNode('b.ts');

      expect(node).toEqual({ id: 'b.ts', label: 'b.ts', color: '#fff' });
    });

    it('getNode() returns null for non-existent node', () => {
      const { api } = createTestAPI();

      const node = api.getNode('nonexistent.ts');

      expect(node).toBeNull();
    });

    it('getNeighbors() returns connected nodes', () => {
      const { api } = createTestAPI();

      const neighbors = api.getNeighbors('b.ts');

      // b.ts connects to a.ts (via a.ts->b.ts) and c.ts (via b.ts->c.ts)
      expect(neighbors).toHaveLength(2);
      expect(neighbors.map((n) => n.id).sort()).toEqual(['a.ts', 'c.ts']);
    });

    it('getNeighbors() returns empty for isolated node', () => {
      const { api, graphProvider } = createTestAPI();
      graphProvider.mockReturnValue({
        nodes: [{ id: 'x.ts', label: 'x.ts', color: '#fff' }],
        edges: [],
      });

      const neighbors = api.getNeighbors('x.ts');

      expect(neighbors).toEqual([]);
    });

    it('getEdgesFor() returns edges connected to a node', () => {
      const { api } = createTestAPI();

      const edges = api.getEdgesFor('b.ts');

      expect(edges).toHaveLength(2);
      expect(edges.map((e) => e.id).sort()).toEqual(['a.ts->b.ts', 'b.ts->c.ts']);
    });

    it('getEdgesFor() returns empty for node with no edges', () => {
      const { api, graphProvider } = createTestAPI();
      graphProvider.mockReturnValue({
        nodes: [{ id: 'x.ts', label: 'x.ts', color: '#fff' }],
        edges: [],
      });

      const edges = api.getEdgesFor('x.ts');

      expect(edges).toEqual([]);
    });
  });

  describe('Registration', () => {
    it('registerView() registers a view with the ViewRegistry', () => {
      const { api, viewRegistry } = createTestAPI();
      const view: IView = {
        id: 'test-view',
        name: 'Test View',
        icon: 'symbol-file',
        description: 'A test view',
        transform: (data) => data,
      };

      api.registerView(view);

      expect(viewRegistry.get('test-view')).toBeDefined();
    });

    it('registerView() returns a disposable that unregisters the view', () => {
      const { api, viewRegistry } = createTestAPI();
      const view: IView = {
        id: 'test-view',
        name: 'Test View',
        icon: 'symbol-file',
        description: 'A test view',
        transform: (data) => data,
      };

      const disposable = api.registerView(view);
      disposable.dispose();

      expect(viewRegistry.get('test-view')).toBeUndefined();
    });

    it('registerView() tags the view with the plugin ID', () => {
      const { api, viewRegistry } = createTestAPI('my-plugin');
      const view: IView = {
        id: 'test-view',
        name: 'Test View',
        icon: 'symbol-file',
        description: 'A test view',
        transform: (data) => data,
      };

      api.registerView(view);

      const registered = viewRegistry.get('test-view');
      expect(registered?.view.pluginId).toBe('my-plugin');
    });

    it('registerCommand() calls the command registrar', () => {
      const { api, commandRegistrar } = createTestAPI();
      const action = vi.fn();
      const command = { id: 'test.command', title: 'Test Command', action };

      api.registerCommand(command);

      expect(commandRegistrar).toHaveBeenCalledWith('test.command', action);
    });

    it('registerCommand() returns a disposable that removes the command', () => {
      const { api } = createTestAPI();
      const command = { id: 'test.command', title: 'Test Command', action: vi.fn() };

      const disposable = api.registerCommand(command);
      expect(api.commands).toHaveLength(1);

      disposable.dispose();
      expect(api.commands).toHaveLength(0);
    });

    it('registerCommand() disposable calls the registrar dispose', () => {
      const innerDispose = vi.fn();
      // Create API with custom command registrar to track dispose
      const commandRegistrar = vi.fn(() => ({ dispose: innerDispose }));
      const apiWithCustomRegistrar = new CodeGraphyAPIImpl(
        'test',
        new EventBus(),
        new DecorationManager(),
        new ViewRegistry(),
        () => ({ nodes: [], edges: [] }),
        commandRegistrar,
        vi.fn(),
        '/workspace',
        vi.fn(),
      );

      const disposable = apiWithCustomRegistrar.registerCommand({
        id: 'cmd',
        title: 'Cmd',
        action: vi.fn(),
      });
      disposable.dispose();

      expect(innerDispose).toHaveBeenCalled();
    });

    it('registerContextMenuItem() adds item to the list', () => {
      const { api } = createTestAPI();
      const item = {
        label: 'Test Item',
        when: 'node' as const,
        action: vi.fn(),
      };

      api.registerContextMenuItem(item);

      expect(api.contextMenuItems).toHaveLength(1);
      expect(api.contextMenuItems[0]).toBe(item);
    });

    it('registerContextMenuItem() returns a disposable that removes the item', () => {
      const { api } = createTestAPI();
      const item = {
        label: 'Test Item',
        when: 'node' as const,
        action: vi.fn(),
      };

      const disposable = api.registerContextMenuItem(item);
      expect(api.contextMenuItems).toHaveLength(1);

      disposable.dispose();
      expect(api.contextMenuItems).toHaveLength(0);
    });
  });

  describe('Webview messaging', () => {
    it('sendToWebview() namespaces the message type with plugin ID', () => {
      const { api, webviewSender } = createTestAPI('my-plugin');

      api.sendToWebview({ type: 'highlight', data: { nodeId: 'a.ts' } });

      expect(webviewSender).toHaveBeenCalledWith({
        type: 'plugin:my-plugin:highlight',
        data: { nodeId: 'a.ts' },
      });
    });

    it('onWebviewMessage() registers a handler', () => {
      const { api } = createTestAPI();
      const handler = vi.fn();

      api.onWebviewMessage(handler);
      api.deliverWebviewMessage({ type: 'click', data: { id: 'a.ts' } });

      expect(handler).toHaveBeenCalledWith({ type: 'click', data: { id: 'a.ts' } });
    });

    it('onWebviewMessage() returns a disposable that unregisters the handler', () => {
      const { api } = createTestAPI();
      const handler = vi.fn();

      const disposable = api.onWebviewMessage(handler);
      disposable.dispose();
      api.deliverWebviewMessage({ type: 'click', data: {} });

      expect(handler).not.toHaveBeenCalled();
    });

    it('deliverWebviewMessage() calls all registered handlers', () => {
      const { api } = createTestAPI();
      const h1 = vi.fn();
      const h2 = vi.fn();

      api.onWebviewMessage(h1);
      api.onWebviewMessage(h2);
      api.deliverWebviewMessage({ type: 'test', data: null });

      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
    });

    it('deliverWebviewMessage() handles errors without stopping other handlers', () => {
      const { api } = createTestAPI();
      const h1 = vi.fn(() => { throw new Error('boom'); });
      const h2 = vi.fn();

      api.onWebviewMessage(h1);
      api.onWebviewMessage(h2);

      // Should not throw
      api.deliverWebviewMessage({ type: 'test', data: null });

      expect(h1).toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });
  });

  describe('Utilities', () => {
    it('getWorkspaceRoot() returns the workspace root', () => {
      const { api } = createTestAPI();
      expect(api.getWorkspaceRoot()).toBe('/workspace');
    });

    it('log() delegates to the log function with plugin prefix', () => {
      const { api, logFn } = createTestAPI('my-plugin');

      api.log('info', 'hello', 'world');

      expect(logFn).toHaveBeenCalledWith('info', '[my-plugin]', 'hello', 'world');
    });

    it('log() supports different levels', () => {
      const { api, logFn } = createTestAPI();

      api.log('warn', 'warning message');
      api.log('error', 'error message');

      expect(logFn).toHaveBeenCalledTimes(2);
      expect(logFn).toHaveBeenCalledWith('warn', '[test-plugin]', 'warning message');
      expect(logFn).toHaveBeenCalledWith('error', '[test-plugin]', 'error message');
    });

    it('pluginId getter returns the plugin ID', () => {
      const { api } = createTestAPI('my-plugin');
      expect(api.pluginId).toBe('my-plugin');
    });
  });

  describe('Cleanup', () => {
    it('disposeAll() removes all event handlers', () => {
      const { api, eventBus } = createTestAPI();
      const handler = vi.fn();

      api.on('analysis:started', handler);
      api.disposeAll();
      eventBus.emit('analysis:started', { fileCount: 1 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('disposeAll() clears all decorations for this plugin', () => {
      const { api, decorationManager } = createTestAPI('plugin-a');

      api.decorateNode('a.ts', { color: '#ff0000' });
      api.decorateEdge('a.ts->b.ts', { color: '#00ff00' });

      // Add decoration from another plugin
      decorationManager.decorateNode('plugin-b', 'a.ts', { color: '#0000ff' });

      api.disposeAll();

      const nodeDecos = decorationManager.getMergedNodeDecorations();
      const edgeDecos = decorationManager.getMergedEdgeDecorations();

      // plugin-b's decoration should remain
      expect(nodeDecos.get('a.ts')).toEqual({ color: '#0000ff' });
      expect(edgeDecos.has('a.ts->b.ts')).toBe(false);
    });

    it('disposeAll() clears all commands', () => {
      const { api } = createTestAPI();

      api.registerCommand({ id: 'cmd1', title: 'Cmd 1', action: vi.fn() });
      api.registerCommand({ id: 'cmd2', title: 'Cmd 2', action: vi.fn() });
      expect(api.commands).toHaveLength(2);

      api.disposeAll();
      expect(api.commands).toHaveLength(0);
    });

    it('disposeAll() clears all context menu items', () => {
      const { api } = createTestAPI();

      api.registerContextMenuItem({ label: 'Item 1', when: 'node', action: vi.fn() });
      api.registerContextMenuItem({ label: 'Item 2', when: 'edge', action: vi.fn() });
      expect(api.contextMenuItems).toHaveLength(2);

      api.disposeAll();
      expect(api.contextMenuItems).toHaveLength(0);
    });

    it('disposeAll() clears all webview message handlers', () => {
      const { api } = createTestAPI();
      const handler = vi.fn();

      api.onWebviewMessage(handler);
      api.disposeAll();
      api.deliverWebviewMessage({ type: 'test', data: null });

      expect(handler).not.toHaveBeenCalled();
    });

    it('disposeAll() disposes registered views', () => {
      const { api, viewRegistry } = createTestAPI();
      const view: IView = {
        id: 'test-view',
        name: 'Test View',
        icon: 'symbol-file',
        description: 'A test view',
        transform: (data) => data,
      };

      api.registerView(view);
      expect(viewRegistry.get('test-view')).toBeDefined();

      api.disposeAll();
      expect(viewRegistry.get('test-view')).toBeUndefined();
    });

    it('disposeAll() calls dispose on the internal DisposableStore', () => {
      const { api } = createTestAPI();
      const handler = vi.fn();

      api.on('analysis:started', handler);

      api.disposeAll();

      // After disposeAll, new event subscriptions should fail because store is disposed
      expect(() => api.on('analysis:started', vi.fn())).toThrow('already been disposed');
    });
  });

  describe('sendToWebview additional', () => {
    it('sendToWebview() forwards data unchanged', () => {
      const { api, webviewSender } = createTestAPI('test-plugin');
      const data = { nested: { value: 42 } };

      api.sendToWebview({ type: 'custom', data });

      expect(webviewSender).toHaveBeenCalledWith({
        type: 'plugin:test-plugin:custom',
        data,
      });
    });
  });

  describe('registerCommand additional', () => {
    it('registerCommand() dispose removes the command from commands list', () => {
      const { api } = createTestAPI();
      const cmd1 = { id: 'cmd1', title: 'Cmd 1', action: vi.fn() };
      const cmd2 = { id: 'cmd2', title: 'Cmd 2', action: vi.fn() };

      api.registerCommand(cmd1);
      const d2 = api.registerCommand(cmd2);

      expect(api.commands).toHaveLength(2);

      d2.dispose();

      expect(api.commands).toHaveLength(1);
      expect(api.commands[0].id).toBe('cmd1');
    });
  });

  describe('registerContextMenuItem additional', () => {
    it('dispose does not remove other items', () => {
      const { api } = createTestAPI();
      const item1 = { label: 'Item 1', when: 'node' as const, action: vi.fn() };
      const item2 = { label: 'Item 2', when: 'edge' as const, action: vi.fn() };

      api.registerContextMenuItem(item1);
      const d2 = api.registerContextMenuItem(item2);

      d2.dispose();

      expect(api.contextMenuItems).toHaveLength(1);
      expect(api.contextMenuItems[0].label).toBe('Item 1');
    });
  });
});
