import { describe, it, expect, beforeEach } from 'vitest';
import { removePluginRegistrations } from '../../../src/webview/pluginHost/pluginHostCleanup';
import type { NodeRenderFn, OverlayRenderFn, TooltipProviderFn } from '../../../src/webview/pluginHost/types';

describe('removePluginRegistrations', () => {
  let nodeRenderers: Map<string, { pluginId: string; fn: NodeRenderFn }>;
  let overlays: Map<string, { pluginId: string; fn: OverlayRenderFn }>;
  let tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }>;
  let messageHandlers: Map<string, Set<(msg: { type: string; data: unknown }) => void>>;
  let containers: Map<string, HTMLDivElement>;

  beforeEach(() => {
    nodeRenderers = new Map();
    overlays = new Map();
    tooltipProviders = [];
    messageHandlers = new Map();
    containers = new Map();
    document.body.innerHTML = '';
  });

  it('removes node renderers belonging to the specified plugin', () => {
    const fn = (() => {}) as unknown as NodeRenderFn;
    nodeRenderers.set('.ts', { pluginId: 'target', fn });
    nodeRenderers.set('.js', { pluginId: 'other', fn });

    removePluginRegistrations('target', nodeRenderers, overlays, tooltipProviders, messageHandlers, containers);

    expect(nodeRenderers.has('.ts')).toBe(false);
    expect(nodeRenderers.has('.js')).toBe(true);
  });

  it('removes overlays belonging to the specified plugin', () => {
    const fn = (() => {}) as unknown as OverlayRenderFn;
    overlays.set('target:heatmap', { pluginId: 'target', fn });
    overlays.set('other:overlay', { pluginId: 'other', fn });

    removePluginRegistrations('target', nodeRenderers, overlays, tooltipProviders, messageHandlers, containers);

    expect(overlays.has('target:heatmap')).toBe(false);
    expect(overlays.has('other:overlay')).toBe(true);
  });

  it('removes tooltip providers belonging to the specified plugin', () => {
    const fn = (() => null) as unknown as TooltipProviderFn;
    tooltipProviders.push({ pluginId: 'target', fn });
    tooltipProviders.push({ pluginId: 'other', fn });
    tooltipProviders.push({ pluginId: 'target', fn });

    removePluginRegistrations('target', nodeRenderers, overlays, tooltipProviders, messageHandlers, containers);

    expect(tooltipProviders).toHaveLength(1);
    expect(tooltipProviders[0].pluginId).toBe('other');
  });

  it('removes message handlers for the specified plugin', () => {
    messageHandlers.set('target', new Set());
    messageHandlers.set('other', new Set());

    removePluginRegistrations('target', nodeRenderers, overlays, tooltipProviders, messageHandlers, containers);

    expect(messageHandlers.has('target')).toBe(false);
    expect(messageHandlers.has('other')).toBe(true);
  });

  it('removes and detaches the container for the specified plugin', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    containers.set('target', container);

    removePluginRegistrations('target', nodeRenderers, overlays, tooltipProviders, messageHandlers, containers);

    expect(containers.has('target')).toBe(false);
    expect(document.body.contains(container)).toBe(false);
  });

  it('handles the case when no container exists for the plugin', () => {
    // Should not throw when no container exists
    removePluginRegistrations('nonexistent', nodeRenderers, overlays, tooltipProviders, messageHandlers, containers);

    expect(containers.size).toBe(0);
  });

  it('removes multiple tooltip providers for the same plugin in reverse order', () => {
    const fn1 = (() => null) as unknown as TooltipProviderFn;
    const fn2 = (() => null) as unknown as TooltipProviderFn;
    const fn3 = (() => null) as unknown as TooltipProviderFn;
    tooltipProviders.push({ pluginId: 'other', fn: fn1 });
    tooltipProviders.push({ pluginId: 'target', fn: fn2 });
    tooltipProviders.push({ pluginId: 'target', fn: fn3 });

    removePluginRegistrations('target', nodeRenderers, overlays, tooltipProviders, messageHandlers, containers);

    expect(tooltipProviders).toHaveLength(1);
    expect(tooltipProviders[0].fn).toBe(fn1);
  });
});
