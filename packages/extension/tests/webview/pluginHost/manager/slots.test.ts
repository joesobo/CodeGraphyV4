import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebviewPluginHost } from '../../../../src/webview/pluginHost/manager';

describe('WebviewPluginHost slots',()=>{
  beforeEach(()=>{ document.body.innerHTML=''; });
  afterEach(()=>vi.restoreAllMocks());

  it('creates and attaches a slot container through the scoped plugin API', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const slotHost = document.createElement('div');
  
      host.attachSlotHost('toolbar', slotHost);
  
      const container = api.getSlotContainer('toolbar');
  
      expect(container.getAttribute('data-cg-plugin')).toBe('acme.plugin');
      expect(container.getAttribute('data-cg-slot')).toBe('toolbar');
      expect(slotHost.getAttribute('data-cg-slot-host')).toBe('toolbar');
      expect(slotHost.contains(container)).toBe(true);
    });

  it('registers ordered slot contributions through the scoped plugin API', () => {
      const host = new WebviewPluginHost();
      const firstApi = host.createAPI('plugin.first', vi.fn());
      const secondApi = host.createAPI('plugin.second', vi.fn());
      const slotHost = document.createElement('div');
      const firstCleanup = vi.fn();
      const secondCleanup = vi.fn();
  
      host.attachSlotHost('theme.panel', slotHost);
      firstApi.registerSlotContribution('theme.panel', {
        id: 'late',
        order: 200,
        render(container) {
          container.textContent = 'Late';
          return firstCleanup;
        },
      });
      const secondDisposable = secondApi.registerSlotContribution('theme.panel', {
        id: 'early',
        order: 100,
        render(container) {
          container.textContent = 'Early';
          return secondCleanup;
        },
      });
  
      expect([...slotHost.children].map(child => child.textContent)).toEqual(['Early', 'Late']);
  
      secondDisposable.dispose();
  
      expect(secondCleanup).toHaveBeenCalledOnce();
      expect(firstCleanup).not.toHaveBeenCalled();
      expect([...slotHost.children].map(child => child.textContent)).toEqual(['Late']);
    });

  it('removes slot contribution cleanup when a plugin is removed', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const slotHost = document.createElement('div');
      const cleanup = vi.fn();
  
      host.attachSlotHost('theme.panel', slotHost);
      api.registerSlotContribution('theme.panel', {
        id: 'controls',
        render(container) {
          container.textContent = 'Controls';
          return cleanup;
        },
      });
  
      host.removePlugin('acme.plugin');
  
      expect(cleanup).toHaveBeenCalledOnce();
      expect(slotHost.childElementCount).toBe(0);
    });

  it('disposes slot contribution cleanup once when host removal and registration disposal both run', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const slotHost = document.createElement('div');
      const cleanup = vi.fn();
  
      host.attachSlotHost('theme.panel', slotHost);
      const disposable = api.registerSlotContribution('theme.panel', {
        id: 'controls',
        render(container) {
          container.textContent = 'Controls';
          return cleanup;
        },
      });
  
      host.removePlugin('acme.plugin');
      disposable.dispose();
  
      expect(cleanup).toHaveBeenCalledOnce();
      expect(slotHost.childElementCount).toBe(0);
    });

  it('removes the slot container if slot contribution rendering throws', () => {
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const slotHost = document.createElement('div');
  
      host.attachSlotHost('theme.panel', slotHost);
  
      expect(() => api.registerSlotContribution('theme.panel', {
        id: 'broken',
        render() {
          throw new Error('render failed');
        },
      })).toThrow('render failed');
  
      expect(slotHost.childElementCount).toBe(0);
      expect(slotHost.style.display).toBe('none');
    });

  it('detaches a slot host through the public manager API', () => {
      const host = new WebviewPluginHost();
      const slotHost = document.createElement('div');
      const firstApi = host.createAPI('acme.plugin', vi.fn());
      const secondApi = host.createAPI('other.plugin', vi.fn());
  
      host.attachSlotHost('toolbar', slotHost);
      const firstContainer = firstApi.getSlotContainer('toolbar');
      host.detachSlotHost('toolbar');
      const secondContainer = secondApi.getSlotContainer('toolbar');
  
      expect(slotHost.getAttribute('data-cg-slot-host')).toBe('toolbar');
      expect(slotHost.contains(firstContainer)).toBe(true);
      expect(slotHost.contains(secondContainer)).toBe(false);
      expect(secondContainer.style.display).toBe('none');
    });
});
