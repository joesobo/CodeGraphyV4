import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TooltipProviderFn } from '@/webview/pluginHost/api/contracts/webview';
import { WebviewPluginHost } from '../../../../src/webview/pluginHost/manager';

describe('WebviewPluginHost tooltips',()=>{
  beforeEach(()=>{ document.body.innerHTML=''; });
  afterEach(()=>vi.restoreAllMocks());

  it('aggregates tooltip sections and ignores failing providers', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const host = new WebviewPluginHost();
      const firstApi = host.createAPI('plugin.one', vi.fn());
      const secondApi = host.createAPI('plugin.two', vi.fn());
  
      firstApi.registerTooltipProvider(() => ({ sections: [{ title: 'One', content: 'First' }] }));
      secondApi.registerTooltipProvider(() => {
        throw new Error('tooltip failed');
      });
      secondApi.registerTooltipProvider(() => ({ sections: [{ title: 'Two', content: 'Second' }] }));
  
      expect(host.getTooltipContent({
        node: { id: 'src/App.ts', label: 'App', color: '#ffffff' },
        neighbors: [],
        edges: [],
      })).toEqual({
        actions: [],
        sections: [
          { title: 'One', content: 'First' },
          { title: 'Two', content: 'Second' },
        ],
      });
      expect(errorSpy).toHaveBeenCalled();
    });

  it('returns null when no tooltip providers contribute content', () => {
      const host = new WebviewPluginHost();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
      expect(host.getTooltipContent({
        node: { id: 'src/App.ts', label: 'App', color: '#ffffff' },
        neighbors: [],
        edges: [],
      })).toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
    });

  it('ignores tooltip providers that do not return sections', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
  
      api.registerTooltipProvider((() => ({})) as unknown as TooltipProviderFn);
      api.registerTooltipProvider((() => undefined) as unknown as TooltipProviderFn);
  
      expect(host.getTooltipContent({
        node: { id: 'src/App.ts', label: 'App', color: '#ffffff' },
        neighbors: [],
        edges: [],
      })).toBeNull();
    });

  it('removes tooltip providers when their disposables are invoked', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
  
      const disposable = api.registerTooltipProvider(() => ({
        sections: [{ title: 'Owner', content: 'Team Graph' }],
      }));
      disposable.dispose();
  
      expect(host.getTooltipContent({
        node: { id: 'src/App.ts', label: 'App', color: '#ffffff' },
        neighbors: [],
        edges: [],
      })).toBeNull();
    });

  it('removes a plugin container, handlers, and tooltip providers together', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const otherApi = host.createAPI('other.plugin', vi.fn());
      const handler = vi.fn();
  
      api.getContainer();
      api.registerNodeRenderer('.ts', vi.fn());
      api.registerOverlay('heatmap', vi.fn());
      api.registerTooltipProvider(() => ({ sections: [{ title: 'One', content: 'First' }] }));
      api.registerGraphViewContributions({
        runtimeNodes: [{
          id: 'acme.runtime-node',
          label: 'Runtime Node',
          createNodes: () => [],
        }],
      });
      api.onMessage(handler);
      otherApi.registerOverlay('other', vi.fn());
  
      host.removePlugin('acme.plugin');
      host.deliverMessage('acme.plugin', { type: 'PING', data: null });
  
      expect(document.querySelector('[data-cg-plugin="acme.plugin"]')).toBeNull();
      expect(host.getNodeRenderers('.ts')).toEqual([]);
      expect(host.getTooltipContent({
        node: { id: 'src/App.ts', label: 'App', color: '#ffffff' },
        neighbors: [],
        edges: [],
      })).toBeNull();
      expect(host.getOverlays()).toEqual([{ id: 'other.plugin:other', fn: expect.any(Function) }]);
      expect(host.getGraphViewContributions().runtimeNodes).toEqual([]);
      expect(handler).not.toHaveBeenCalled();
    });
});
