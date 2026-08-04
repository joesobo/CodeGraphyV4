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

  it('continues removing slot contributions when one cleanup throws', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const host = new WebviewPluginHost();
      const api = host.createAPI('acme.plugin', vi.fn());
      const slotHost = document.createElement('div');
      const failingCleanup = vi.fn(() => {
        throw new Error('cleanup failed');
      });
      const healthyCleanup = vi.fn();

      host.attachSlotHost('theme.panel', slotHost);
      api.registerSlotContribution('theme.panel', {
        id: 'failing',
        render: () => failingCleanup,
      });
      api.registerSlotContribution('theme.panel', {
        id: 'healthy',
        render: () => healthyCleanup,
      });

      expect(() => host.removePlugin('acme.plugin')).not.toThrow();

      expect(failingCleanup).toHaveBeenCalledOnce();
      expect(healthyCleanup).toHaveBeenCalledOnce();
      expect(slotHost.childElementCount).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clean up slot contribution'),
        expect.any(Error),
      );
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

  it('rejects legacy graph.panelSlot access through generic runtime paths', () => {
    const api = new WebviewPluginHost().createAPI('acme.plugin', vi.fn());

    expect(() => Reflect.apply(api.getSlotContainer, api, ['graph.panelSlot']))
      .toThrow(/registerPanelContribution/);
    expect(() => Reflect.apply(api.registerSlotContribution, api, [
      'graph.panelSlot',
      { id: 'legacy', render: () => undefined },
    ])).toThrow(/registerPanelContribution/);
  });

  it('registers plugin panels closed until their handle opens them', () => {
    const host = new WebviewPluginHost();
    const panelHost = document.createElement('div');
    host.attachPanelHost(panelHost);
    const handle = host.createAPI('acme.plugin').registerPanelContribution({
      id: 'inspector',
      render(container) {
        container.textContent = 'Inspector';
      },
    });

    expect(handle.isOpen()).toBe(false);
    expect(panelHost).toBeEmptyDOMElement();

    handle.open();

    expect(handle.isOpen()).toBe(true);
    expect(panelHost).toHaveTextContent('Inspector');
  });

  it('closes the built-in panel through the host seam before a plugin panel opens', () => {
    const host = new WebviewPluginHost();
    const closeBuiltInPanel = vi.fn();
    host.setBeforePluginPanelOpen(closeBuiltInPanel);
    const handle = host.createAPI('acme.plugin').registerPanelContribution({
      id: 'inspector',
      render: () => undefined,
    });

    handle.open();

    expect(closeBuiltInPanel).toHaveBeenCalledOnce();
    expect(handle.isOpen()).toBe(true);
  });

  it('keeps one active plugin panel and allows a dismissed panel to reopen', () => {
    const host = new WebviewPluginHost();
    const panelHost = document.createElement('div');
    host.attachPanelHost(panelHost);
    const first = host.createAPI('plugin.first').registerPanelContribution({
      id: 'panel',
      render: container => { container.textContent = 'First'; },
    });
    const second = host.createAPI('plugin.second').registerPanelContribution({
      id: 'panel',
      render: container => { container.textContent = 'Second'; },
    });

    first.open();
    second.open();

    expect(first.isOpen()).toBe(false);
    expect(second.isOpen()).toBe(true);
    expect(panelHost).toHaveTextContent('Second');
    expect(panelHost).not.toHaveTextContent('First');

    expect(host.handleActivePluginPanelEscape()).toBe('dismissed');
    expect(second.isOpen()).toBe(false);
    second.open();
    expect(second.isOpen()).toBe(true);
  });

  it('lets an active plugin panel prevent host dismissal for one Escape press', () => {
    const host = new WebviewPluginHost();
    const onEscape = vi.fn(event => event.preventDefault());
    const handle = host.createAPI('acme.plugin').registerPanelContribution({
      id: 'inspector',
      render: () => undefined,
      onEscape,
    });
    handle.open();

    expect(host.handleActivePluginPanelEscape()).toBe('prevented');
    expect(onEscape).toHaveBeenCalledOnce();
    expect(handle.isOpen()).toBe(true);
  });

  it('disposes panel rendering and clears active panel state on plugin removal', () => {
    const host = new WebviewPluginHost();
    const cleanup = vi.fn();
    const handle = host.createAPI('acme.plugin').registerPanelContribution({
      id: 'inspector',
      render: () => cleanup,
    });
    handle.open();

    host.removePlugin('acme.plugin');

    expect(cleanup).toHaveBeenCalledOnce();
    expect(handle.isOpen()).toBe(false);
    expect(host.getActivePluginPanel()).toBeNull();
  });
});
