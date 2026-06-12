// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CodeGraphyWebviewAPI, GraphPluginSlot } from '@codegraphy-dev/plugin-api';
import { createParticlesPlugin } from '../src/plugin';
import { activate } from '../src/webview';
import { startBackgroundParticleEffect, startCustomParticleEffect } from '../src/effects';

vi.mock('../src/effects', () => ({
  startCustomParticleEffect: vi.fn(() => vi.fn()),
  startBackgroundParticleEffect: vi.fn(() => vi.fn()),
}));

describe('createParticlesPlugin', () => {
  it('ships a webview script for plugin-owned theme controls', () => {
    const plugin = createParticlesPlugin();

    expect(plugin.webviewContributions).toEqual({
      scripts: ['dist/webview.js'],
      assets: [],
    });
  });

  it('renders theme controls and starts the selected particle canvas from plugin data', () => {
    const controls = document.createElement('div');
    const overlay = document.createElement('div');
    const api = createWebviewApi({
      'theme.panel': controls,
      'graph.stage.worldOverlay': overlay,
    }, {
      enabled: true,
      preset: 'petals',
      intensity: 0.5,
    });

    activate(api);

    expect(controls.querySelector('[data-codegraphy-section="background-effects"]')).not.toBeNull();
    expect(
      controls.querySelector('[aria-label="Toggle Leaves background effect"]')?.getAttribute('data-state'),
    ).toBe('checked');
    expect(overlay.querySelector('canvas.cg-bg-particles-canvas')).not.toBeNull();
    expect(startBackgroundParticleEffect).toHaveBeenCalledWith(expect.objectContaining({
      canvas: overlay.querySelector('canvas.cg-bg-particles-canvas'),
      color: 'rgb(143 207 107)',
      intensity: 0.5,
      preset: 'petals',
      prewarmFrames: 180,
    }));
  });

  it('stores particle settings through plugin-owned data', () => {
    const controls = document.createElement('div');
    const overlay = document.createElement('div');
    const api = createWebviewApi({
      'theme.panel': controls,
      'graph.stage.worldOverlay': overlay,
    });

    activate(api);
    controls.querySelector<HTMLButtonElement>('[aria-label="Toggle Embers background effect"]')?.click();

    expect(api.setPluginData).toHaveBeenCalledWith({
      enabled: true,
      intensity: 1,
      preset: 'embers',
    });
  });

  it('renders compiled custom particle effects from plugin webview assets', () => {
    const controls = document.createElement('div');
    const overlay = document.createElement('div');
    const handlers: Array<(message: { type: string; data: unknown }) => void> = [];
    const api = createWebviewApi({
      'theme.panel': controls,
      'graph.stage.worldOverlay': overlay,
    });
    vi.mocked(api.onMessage).mockImplementation((handler) => {
      handlers.push(handler);
      return { dispose: vi.fn() };
    });

    activate(api);
    handlers[0]?.({
      type: 'PLUGIN_WEBVIEW_ASSETS_UPDATED',
      data: [
        {
          id: 'repo-fireflies',
          label: 'Repo Fireflies',
          url: 'data:text/javascript,export function activateParticleEffect(){}',
          kind: 'particle-effect',
        },
      ],
    });
    controls.querySelector<HTMLButtonElement>(
      '[aria-label="Toggle Repo Fireflies custom background effect"]',
    )?.click();

    expect(api.setPluginData).toHaveBeenCalledWith({
      enabled: true,
      intensity: 1,
      preset: 'custom',
      customEffectId: 'repo-fireflies',
    });
    handlers[0]?.({
      type: 'PLUGIN_DATA_UPDATED',
      data: {
        enabled: true,
        intensity: 1,
        preset: 'custom',
        customEffectId: 'repo-fireflies',
      },
    });
    expect(startCustomParticleEffect).toHaveBeenCalledWith(expect.objectContaining({
      moduleUrl: 'data:text/javascript,export function activateParticleEffect(){}',
    }));
  });

  it('cleans up active particle work when the plugin is disposed', () => {
    const cleanup = vi.fn();
    vi.mocked(startBackgroundParticleEffect).mockReturnValueOnce(cleanup);
    const controls = document.createElement('div');
    const overlay = document.createElement('div');
    const messageSubscription = { dispose: vi.fn() };
    const api = createWebviewApi({
      'theme.panel': controls,
      'graph.stage.worldOverlay': overlay,
    }, {
      enabled: true,
      preset: 'petals',
      intensity: 1,
    });
    vi.mocked(api.onMessage).mockReturnValueOnce(messageSubscription);

    const dispose = activate(api);
    expect(overlay.querySelector('canvas.cg-bg-particles-canvas')).not.toBeNull();
    expect(document.getElementById('cg-particles-plugin-style')).not.toBeNull();

    dispose();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(messageSubscription.dispose).toHaveBeenCalledOnce();
    expect(controls.childElementCount).toBe(0);
    expect(overlay.childElementCount).toBe(0);
    expect(document.getElementById('cg-particles-plugin-style')).toBeNull();
  });
});

beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  vi.clearAllMocks();
});

function createWebviewApi(
  slots: Partial<Record<GraphPluginSlot, HTMLElement>>,
  pluginData: unknown = undefined,
): CodeGraphyWebviewAPI {
  return {
    getContainer: vi.fn(() => document.createElement('div')),
    getSlotContainer: vi.fn((slot: GraphPluginSlot) => slots[slot]),
    getHostState: vi.fn(() => ({})),
    getPluginData: vi.fn(() => pluginData),
    setPluginData: vi.fn(),
    getGraphViewViewportState: vi.fn(() => null),
    onGraphViewViewportState: vi.fn(() => ({ dispose: vi.fn() })),
    registerNodeRenderer: vi.fn(() => ({ dispose: vi.fn() })),
    registerOverlay: vi.fn(() => ({ dispose: vi.fn() })),
    registerTooltipProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerGraphViewContributions: vi.fn(() => ({ dispose: vi.fn() })),
    sendMessage: vi.fn(),
    postHostMessage: vi.fn(),
    onMessage: vi.fn(() => ({ dispose: vi.fn() })),
    helpers: {
      drawBadge: vi.fn(),
      drawProgressRing: vi.fn(),
      drawLabel: vi.fn(),
    },
  };
}
