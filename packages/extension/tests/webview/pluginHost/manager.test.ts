import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TooltipProviderFn } from '@/webview/pluginHost/api/contracts';
import { WebviewPluginHost } from '../../../src/webview/pluginHost/manager';

function createMockContext(): CanvasRenderingContext2D {
  return {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    measureText: vi.fn(() => ({ width: 24 })),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('WebviewPluginHost', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('keeps a newer node renderer when an older plugin renderer is disposed', () => {
    const host = new WebviewPluginHost();
    const firstApi = host.createAPI('plugin.one', vi.fn());
    const secondApi = host.createAPI('plugin.two', vi.fn());
    const firstRenderer = vi.fn();
    const secondRenderer = vi.fn();

    const firstDisposable = firstApi.registerNodeRenderer('.ts', firstRenderer);
    secondApi.registerNodeRenderer('.ts', secondRenderer);
    firstDisposable.dispose();

    expect(host.getNodeRenderer('.ts')).toBe(secondRenderer);
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
      sections: [
        { title: 'One', content: 'First' },
        { title: 'Two', content: 'Second' },
      ],
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  it('returns null when no tooltip providers contribute content', () => {
    const host = new WebviewPluginHost();

    expect(host.getTooltipContent({
      node: { id: 'src/App.ts', label: 'App', color: '#ffffff' },
      neighbors: [],
      edges: [],
    })).toBeNull();
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
    api.onMessage(handler);
    otherApi.registerOverlay('other', vi.fn());

    host.removePlugin('acme.plugin');
    host.deliverMessage('acme.plugin', { type: 'PING', data: null });

    expect(document.querySelector('[data-cg-plugin="acme.plugin"]')).toBeNull();
    expect(host.getNodeRenderer('.ts')).toBeUndefined();
    expect(host.getTooltipContent({
      node: { id: 'src/App.ts', label: 'App', color: '#ffffff' },
      neighbors: [],
      edges: [],
    })).toBeNull();
    expect(host.getOverlays()).toEqual([{ id: 'other.plugin:other', fn: expect.any(Function) }]);
    expect(handler).not.toHaveBeenCalled();
  });

  it('draws badges with default colors and centered text', () => {
    const ctx = createMockContext();

    WebviewPluginHost.drawBadge(ctx, { x: 10, y: 20, text: '3' });

    expect(ctx.font).toBe('bold 8px sans-serif');
    expect(ctx.fillStyle).toBe('#FFFFFF');
    expect(ctx.textAlign).toBe('center');
    expect(ctx.textBaseline).toBe('middle');
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith('3', 10, 20);
  });

  it('uses custom badge colors and font sizes when provided', () => {
    const ctx = createMockContext();

    WebviewPluginHost.drawBadge(ctx, {
      x: 10,
      y: 20,
      text: '7',
      fontSize: 12,
      bgColor: '#111111',
      color: '#eeeeee',
    });

    expect(ctx.font).toBe('bold 12px sans-serif');
    expect(ctx.fillStyle).toBe('#eeeeee');
    expect(ctx.roundRect).toHaveBeenCalledWith(10 - 15, 20 - 9, 30, 18, 9);
  });

  it('draws progress rings with default width and progress', () => {
    const ctx = createMockContext();

    WebviewPluginHost.drawProgressRing(ctx, { x: 10, y: 20, radius: 12, color: '#00ff00' });

    expect(ctx.lineWidth).toBe(2);
    expect(ctx.strokeStyle).toBe('#00ff00');
    expect(ctx.arc).toHaveBeenCalledWith(10, 20, 12, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * 1);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('uses custom progress-ring width and progress values when provided', () => {
    const ctx = createMockContext();

    WebviewPluginHost.drawProgressRing(ctx, {
      x: 10,
      y: 20,
      radius: 12,
      color: '#00ff00',
      width: 4,
      progress: 0.25,
    });

    expect(ctx.lineWidth).toBe(4);
    expect(ctx.arc).toHaveBeenCalledWith(10, 20, 12, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * 0.25);
  });

  it('draws labels with default alignment and font size', () => {
    const ctx = createMockContext();

    WebviewPluginHost.drawLabel(ctx, { x: 8, y: 12, text: 'File.ts' });

    expect(ctx.font).toBe('10px sans-serif');
    expect(ctx.fillStyle).toBe('#FFFFFF');
    expect(ctx.textAlign).toBe('center');
    expect(ctx.textBaseline).toBe('middle');
    expect(ctx.fillText).toHaveBeenCalledWith('File.ts', 8, 12);
  });
});
