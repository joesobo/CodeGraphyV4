import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebviewPluginHost } from '../../../../src/webview/pluginHost/manager';

describe('WebviewPluginHost messaging and viewport',()=>{
  beforeEach(()=>{ document.body.innerHTML=''; });
  afterEach(()=>vi.restoreAllMocks());

  it('creates and reuses a hidden container for each plugin', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
  
      const firstContainer = api.getContainer();
      const secondContainer = api.getContainer();
  
      expect(firstContainer).toBe(secondContainer);
      expect(firstContainer.getAttribute('data-cg-plugin')).toBe('acme.plugin');
      expect(firstContainer.style.display).toBe('none');
      expect(document.body.contains(firstContainer)).toBe(true);
    });

  it('scopes outbound graph interaction messages by plugin id', () => {
      const postMessage = vi.fn();
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', postMessage);
  
      api.sendMessage({ type: 'NODE_SELECTED', data: { nodeId: 'src/App.ts' } });
  
      expect(postMessage).toHaveBeenCalledWith({
        type: 'GRAPH_INTERACTION',
        payload: {
          event: 'plugin:acme.plugin:NODE_SELECTED',
          data: { nodeId: 'src/App.ts' },
        },
      });
    });

  it('delivers plugin messages to subscribed handlers and stops after disposal', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const handler = vi.fn();
  
      const disposable = api.onMessage(handler);
      host.deliverMessage('acme.plugin', { type: 'PING', data: { ok: true } });
      disposable.dispose();
      host.deliverMessage('acme.plugin', { type: 'PING', data: { ok: false } });
  
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ type: 'PING', data: { ok: true } });
    });

  it('shares live Graph View viewport state with scoped plugin APIs', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const handler = vi.fn();
      const state = {
        graphToScreen: (x: number, y: number) => ({ x: x + 1, y: y + 1 }),
        nodes: [{ id: 'src/app.ts', x: 10, y: 20 }],
        reheatSimulation: vi.fn(),
        resumeAnimation: vi.fn(),
        screenToGraph: (x: number, y: number) => ({ x: x - 1, y: y - 1 }),
        updateNode: vi.fn(() => true),
        zoom: 1.5,
      };
  
      const disposable = api.onGraphViewViewportState(handler);
      host.setGraphViewViewportState(state);
      disposable.dispose();
      host.setGraphViewViewportState(null);
  
      expect(api.getGraphViewViewportState()).toBeNull();
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, null);
      expect(handler).toHaveBeenNthCalledWith(2, state);
    });

  it('reports Graph View viewport consumers when plugins listen or render overlays', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
  
      expect(host.hasGraphViewViewportConsumers()).toBe(false);
  
      const listenerDisposable = api.onGraphViewViewportState(vi.fn());
      expect(host.hasGraphViewViewportConsumers()).toBe(true);
  
      listenerDisposable.dispose();
      expect(host.hasGraphViewViewportConsumers()).toBe(false);
  
      const overlayDisposable = api.registerOverlay('overlay', vi.fn());
      expect(host.hasGraphViewViewportConsumers()).toBe(true);
  
      overlayDisposable.dispose();
      expect(host.hasGraphViewViewportConsumers()).toBe(false);
    });

  it('removes scoped Graph View viewport listeners when a plugin is removed', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const handler = vi.fn();
      const state = {
        graphToScreen: (x: number, y: number) => ({ x, y }),
        nodes: [{ id: 'src/app.ts', x: 10, y: 20 }],
        reheatSimulation: vi.fn(),
        resumeAnimation: vi.fn(),
        screenToGraph: (x: number, y: number) => ({ x, y }),
        updateNode: vi.fn(() => true),
        zoom: 1,
      };
  
      api.onGraphViewViewportState(handler);
      host.removePlugin('acme.plugin');
      host.setGraphViewViewportState(state);
  
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(null);
    });

  it('continues delivering plugin messages when one handler throws', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const failingHandler = vi.fn(() => {
        throw new Error('boom');
      });
      const successfulHandler = vi.fn();
  
      api.onMessage(failingHandler);
      api.onMessage(successfulHandler);
      host.deliverMessage('acme.plugin', { type: 'PING', data: null });
  
      expect(successfulHandler).toHaveBeenCalledWith({ type: 'PING', data: null });
      expect(errorSpy).toHaveBeenCalled();
    });
});
