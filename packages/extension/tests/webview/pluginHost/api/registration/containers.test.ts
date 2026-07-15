import { describe, expect, it } from 'vitest';
import type { GraphPluginSlot } from '../../../../../src/webview/pluginHost/api/contracts/webview';
import {
  attachSlotHost,
  detachSlotHost,
  getOrCreateContainer,
  getOrCreateSlotContainer,
} from '../../../../../src/webview/pluginHost/api/registration/containers';

describe('pluginHost/api/registration/containers', () => {
  it('creates and reuses plugin containers', () => {
    const containers = new Map<string, HTMLDivElement>();
    const first = getOrCreateContainer('plugin-a', containers);
    const second = getOrCreateContainer('plugin-a', containers);

    expect(first).toBe(second);
    expect(first.getAttribute('data-cg-plugin')).toBe('plugin-a');
    expect(first.style.display).toBe('none');
  });

  it('creates slot containers and moves them into attached hosts', () => {
    const slotContainers = new Map<string, Map<GraphPluginSlot, HTMLDivElement>>();
    const slotHosts = new Map<GraphPluginSlot, HTMLDivElement>();

    const container = getOrCreateSlotContainer('plugin-a', 'toolbar', slotContainers as never, slotHosts as never);
    const host = document.createElement('div');
    attachSlotHost('toolbar', host, slotContainers as never, slotHosts as never);

    expect(container.getAttribute('data-cg-slot')).toBe('toolbar');
    expect(host.contains(container)).toBe(true);
    expect(host.style.display).toBe('');

    detachSlotHost('toolbar', slotHosts as never);
    expect(slotHosts.has('toolbar')).toBe(false);
  });

  it('reuses an existing slot container and can attach a host after the container already exists', () => {
    const slotContainers = new Map<string, Map<GraphPluginSlot, HTMLDivElement>>();
    const slotHosts = new Map<GraphPluginSlot, HTMLDivElement>();

    const first = getOrCreateSlotContainer('plugin-a', 'toolbar', slotContainers as never, slotHosts as never);
    const second = getOrCreateSlotContainer('plugin-a', 'toolbar', slotContainers as never, slotHosts as never);
    const host = document.createElement('div');

    attachSlotHost('toolbar', host, slotContainers as never, slotHosts as never);
    getOrCreateSlotContainer('plugin-a', 'graph-overlay', slotContainers as never, slotHosts as never);

    expect(first).toBe(second);
    expect(host.contains(first)).toBe(true);
    expect(slotContainers.get('plugin-a')).toBeDefined();
  });

  it('attaches a slot host even when no matching slot container exists yet', () => {
    const slotContainers = new Map<string, Map<GraphPluginSlot, HTMLDivElement>>();
    const slotHosts = new Map<GraphPluginSlot, HTMLDivElement>();
    const host = document.createElement('div');

    slotContainers.set('plugin-a', new Map());
    attachSlotHost('toolbar', host, slotContainers as never, slotHosts as never);

    expect(host.getAttribute('data-cg-slot-host')).toBe('toolbar');
    expect(host.style.display).toBe('none');
  });

  it('creates a slot container directly inside an already attached host', () => {
    const slotContainers = new Map<string, Map<GraphPluginSlot, HTMLDivElement>>();
    const slotHosts = new Map<GraphPluginSlot, HTMLDivElement>();
    const host = document.createElement('div');

    attachSlotHost('toolbar', host, slotContainers as never, slotHosts as never);
    const container = getOrCreateSlotContainer('plugin-a', 'toolbar', slotContainers as never, slotHosts as never);

    expect(host.contains(container)).toBe(true);
    expect(host.style.display).toBe('');
  });

  it('attaches only contributions that target the new slot host', () => {
    const host = document.createElement('div');
    const toolbarContribution = document.createElement('div');
    const overlayContribution = document.createElement('div');
    toolbarContribution.style.display = 'none';
    overlayContribution.style.display = 'none';
    const slotContributions = new Map([
      ['plugin-a', new Set([
        {
          pluginId: 'plugin-a',
          id: 'toolbar-action',
          order: 1,
          slot: 'toolbar' as const,
          container: toolbarContribution,
        },
        {
          pluginId: 'plugin-a',
          id: 'overlay-action',
          order: 2,
          slot: 'graph-overlay' as const,
          container: overlayContribution,
        },
      ])],
    ]);

    attachSlotHost('toolbar', host, new Map(), new Map(), slotContributions);

    expect(host.contains(toolbarContribution)).toBe(true);
    expect(toolbarContribution.style.display).toBe('');
    expect(host.contains(overlayContribution)).toBe(false);
    expect(overlayContribution.style.display).toBe('none');
  });
});
