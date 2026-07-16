import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebviewPluginHost } from '../../../../src/webview/pluginHost/manager';
import { createMockContext } from './fixture';

describe('WebviewPluginHost render contributions',()=>{
  beforeEach(()=>{ document.body.innerHTML=''; });
  afterEach(()=>vi.restoreAllMocks());

  it('exposes helper delegates on the scoped plugin API', () => {
      const badgeSpy = vi.spyOn(WebviewPluginHost, 'drawBadge').mockImplementation(() => {});
      const ringSpy = vi.spyOn(WebviewPluginHost, 'drawProgressRing').mockImplementation(() => {});
      const labelSpy = vi.spyOn(WebviewPluginHost, 'drawLabel').mockImplementation(() => {});
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const ctx = createMockContext();
  
      api.helpers.drawBadge(ctx, { x: 1, y: 2, text: '1' });
      api.helpers.drawProgressRing(ctx, { x: 1, y: 2, radius: 3, color: '#00ff00' });
      api.helpers.drawLabel(ctx, { x: 1, y: 2, text: 'Label' });
  
      expect(badgeSpy).toHaveBeenCalled();
      expect(ringSpy).toHaveBeenCalled();
      expect(labelSpy).toHaveBeenCalled();
    });

  it('keeps a newer node renderer when an older plugin renderer is disposed', () => {
      const host = new WebviewPluginHost();
      const firstApi = host.createAPI('plugin.one', vi.fn());
      const secondApi = host.createAPI('plugin.two', vi.fn());
      const firstRenderer = vi.fn();
      const secondRenderer = vi.fn();
  
      const firstDisposable = firstApi.registerNodeRenderer('.ts', firstRenderer);
      secondApi.registerNodeRenderer('.ts', secondRenderer);
      firstDisposable.dispose();
  
      expect(host.getNodeRenderers('.ts')).toEqual([secondRenderer]);
    });

  it('returns type-specific node renderers with wildcard renderers', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const typeRenderer = vi.fn();
      const wildcardRenderer = vi.fn();
  
      api.registerNodeRenderer('.ts', typeRenderer);
      api.registerNodeRenderer('*', wildcardRenderer);
  
      expect(host.getNodeRenderers('.ts')).toEqual([typeRenderer, wildcardRenderer]);
    });

  it('returns qualified overlay ids and removes a plugin overlay on dispose', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const overlay = vi.fn();
  
      const disposable = api.registerOverlay('heatmap', overlay);
      expect(host.getOverlays()).toEqual([{ id: 'acme.plugin:heatmap', fn: overlay }]);
  
      disposable.dispose();
      expect(host.getOverlays()).toEqual([]);
    });

  it('registers graph-view contributions from scoped plugin APIs and removes them on dispose', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const listener = vi.fn();
      const contribution = {
        id: 'acme.plugin.runtime-node',
        label: 'Runtime Node',
        createNodes: () => [{ id: 'runtime-node', label: 'Runtime', color: '#ffffff' }],
      };
  
      const unsubscribe = host.subscribeGraphViewContributions(listener);
      const disposable = api.registerGraphViewContributions({
        runtimeNodes: [contribution],
      });
  
      expect(host.getGraphViewContributions().runtimeNodes).toEqual([
        {
          pluginId: 'acme.plugin',
          contribution,
        },
      ]);
      expect(listener).toHaveBeenCalledTimes(1);
  
      disposable.dispose();
  
      expect(host.getGraphViewContributions().runtimeNodes).toEqual([]);
      expect(listener).toHaveBeenCalledTimes(2);
  
      unsubscribe.dispose();
    });

  it('returns a stable graph-view contribution snapshot until registrations change', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const contribution = {
        id: 'acme.plugin.runtime-node',
        label: 'Runtime Node',
        createNodes: () => [{ id: 'runtime-node', label: 'Runtime', color: '#ffffff' }],
      };
  
      const disposable = api.registerGraphViewContributions({
        runtimeNodes: [contribution],
      });
      const firstSnapshot = host.getGraphViewContributions();
      const secondSnapshot = host.getGraphViewContributions();
  
      expect(secondSnapshot).toBe(firstSnapshot);
  
      disposable.dispose();
      const emptySnapshot = host.getGraphViewContributions();
  
      expect(emptySnapshot).not.toBe(firstSnapshot);
      expect(host.getGraphViewContributions()).toBe(emptySnapshot);
    });
});
