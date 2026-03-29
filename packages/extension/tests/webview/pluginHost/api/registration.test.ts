import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerNodeRenderer,
  registerOverlay,
  registerTooltipProvider,
  getOrCreateContainer,
} from '../../../../src/webview/pluginHost/api/registration';
import type { NodeRenderFn, OverlayRenderFn, TooltipProviderFn } from '../../../../src/webview/pluginHost/api/contracts';

describe('registerNodeRenderer', () => {
  let nodeRenderers: Map<string, { pluginId: string; fn: NodeRenderFn }>;

  beforeEach(() => {
    nodeRenderers = new Map();
  });

  it('adds a node renderer to the map', () => {
    const fn = (() => {}) as unknown as NodeRenderFn;
    registerNodeRenderer('plugin-a', '.ts', fn, nodeRenderers);

    expect(nodeRenderers.get('.ts')).toEqual({ pluginId: 'plugin-a', fn });
  });

  it('returns a disposable that removes the renderer', () => {
    const fn = (() => {}) as unknown as NodeRenderFn;
    const disposable = registerNodeRenderer('plugin-a', '.ts', fn, nodeRenderers);

    disposable.dispose();

    expect(nodeRenderers.has('.ts')).toBe(false);
  });

  it('does not remove a renderer registered by a different plugin on dispose', () => {
    const fnA = (() => {}) as unknown as NodeRenderFn;
    const fnB = (() => {}) as unknown as NodeRenderFn;

    const disposableA = registerNodeRenderer('plugin-a', '.ts', fnA, nodeRenderers);
    registerNodeRenderer('plugin-b', '.ts', fnB, nodeRenderers);

    disposableA.dispose();

    expect(nodeRenderers.get('.ts')).toEqual({ pluginId: 'plugin-b', fn: fnB });
  });

  it('overwrites an existing renderer for the same type', () => {
    const fnA = (() => {}) as unknown as NodeRenderFn;
    const fnB = (() => {}) as unknown as NodeRenderFn;

    registerNodeRenderer('plugin-a', '.ts', fnA, nodeRenderers);
    registerNodeRenderer('plugin-b', '.ts', fnB, nodeRenderers);

    expect(nodeRenderers.get('.ts')?.pluginId).toBe('plugin-b');
  });
});

describe('registerOverlay', () => {
  let overlays: Map<string, { pluginId: string; fn: OverlayRenderFn }>;

  beforeEach(() => {
    overlays = new Map();
  });

  it('adds an overlay with a qualified id', () => {
    const fn = (() => {}) as unknown as OverlayRenderFn;
    registerOverlay('plugin-a', 'heatmap', fn, overlays);

    expect(overlays.has('plugin-a:heatmap')).toBe(true);
    expect(overlays.get('plugin-a:heatmap')?.pluginId).toBe('plugin-a');
  });

  it('returns a disposable that removes the overlay', () => {
    const fn = (() => {}) as unknown as OverlayRenderFn;
    const disposable = registerOverlay('plugin-a', 'heatmap', fn, overlays);

    disposable.dispose();

    expect(overlays.has('plugin-a:heatmap')).toBe(false);
  });
});

describe('registerTooltipProvider', () => {
  let tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }>;

  beforeEach(() => {
    tooltipProviders = [];
  });

  it('adds a tooltip provider to the array', () => {
    const fn = (() => null) as unknown as TooltipProviderFn;
    registerTooltipProvider('plugin-a', fn, tooltipProviders);

    expect(tooltipProviders).toHaveLength(1);
    expect(tooltipProviders[0].pluginId).toBe('plugin-a');
  });

  it('returns a disposable that removes the provider', () => {
    const fn = (() => null) as unknown as TooltipProviderFn;
    const disposable = registerTooltipProvider('plugin-a', fn, tooltipProviders);

    disposable.dispose();

    expect(tooltipProviders).toHaveLength(0);
  });

  it('does not remove a provider when the index is not found on dispose', () => {
    const fn1 = (() => null) as unknown as TooltipProviderFn;
    const fn2 = (() => null) as unknown as TooltipProviderFn;
    const disposable = registerTooltipProvider('plugin-a', fn1, tooltipProviders);
    registerTooltipProvider('plugin-b', fn2, tooltipProviders);

    // Manually remove fn1 from array so dispose finds idx === -1
    tooltipProviders.splice(0, 1);
    disposable.dispose();

    expect(tooltipProviders).toHaveLength(1);
    expect(tooltipProviders[0].pluginId).toBe('plugin-b');
  });
});

describe('getOrCreateContainer', () => {
  let containers: Map<string, HTMLDivElement>;

  beforeEach(() => {
    containers = new Map();
    document.body.innerHTML = '';
  });

  it('creates a new container for a plugin', () => {
    const container = getOrCreateContainer('plugin-a', containers);

    expect(container).toBeInstanceOf(HTMLDivElement);
    expect(container.getAttribute('data-cg-plugin')).toBe('plugin-a');
    expect(container.style.display).toBe('none');
    expect(document.body.contains(container)).toBe(true);
    expect(containers.get('plugin-a')).toBe(container);
  });

  it('reuses an existing container for the same plugin', () => {
    const first = getOrCreateContainer('plugin-a', containers);
    const second = getOrCreateContainer('plugin-a', containers);

    expect(first).toBe(second);
  });

  it('creates separate containers for different plugins', () => {
    const containerA = getOrCreateContainer('plugin-a', containers);
    const containerB = getOrCreateContainer('plugin-b', containers);

    expect(containerA).not.toBe(containerB);
    expect(containers.size).toBe(2);
  });
});
