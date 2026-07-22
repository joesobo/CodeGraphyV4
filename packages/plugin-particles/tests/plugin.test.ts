// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CodeGraphyWebviewAPI, GraphPluginSlot } from '@codegraphy-dev/extension-plugin-api';
import { createParticlesPlugin } from '../src/plugin';
import { activate } from '../src/webview';
import { startBackgroundParticleEffect, startCustomParticleEffect } from '../src/effects';

vi.mock('../src/effects', () => ({
  BACKGROUND_PARTICLE_PREWARM_SECONDS: 72,
  startCustomParticleEffect: vi.fn(() => vi.fn()),
  startBackgroundParticleEffect: vi.fn(() => vi.fn()),
}));

const ROOT_PREWARM_SECONDS = 72;

describe('createParticlesPlugin', () => {
  it('ships a webview script for plugin-owned theme controls', () => {
    const plugin = createParticlesPlugin();

    expect(plugin.webviewContributions).toEqual({
      scripts: ['dist/webview.js'],
      assets: [],
    });
  });

  it('renders theme controls and starts the selected particle canvas from plugin data', () => {
    const { controls, overlay } = activateParticlesHarness({
      enabled: true,
      preset: 'leaves',
    });

    expect(controls.querySelector('[data-codegraphy-section="particles"]')).not.toBeNull();
    expect(screenText(controls)).toContain('Particles');
    expect(screenText(controls)).not.toContain('Graph Background');
    expect(
      controls.querySelector('[aria-label="Toggle Leaves background effect"]')?.getAttribute('data-state'),
    ).toBe('checked');
    expect(overlay.querySelector('canvas.cg-bg-particles-canvas')).not.toBeNull();
    expect(startBackgroundParticleEffect).toHaveBeenCalledWith(expect.objectContaining({
      canvas: overlay.querySelector('canvas.cg-bg-particles-canvas'),
      color: '#8fcf6b',
      intensity: 1,
      preset: 'leaves',
      prewarmSeconds: ROOT_PREWARM_SECONDS,
    }));
  });

  it('stores particle settings through plugin-owned data', () => {
    const { api, controls } = activateParticlesHarness();

    controls.querySelector<HTMLButtonElement>('[aria-label="Toggle Embers background effect"]')?.click();

    expect(api.setPluginData).toHaveBeenCalledWith({
      enabled: true,
      preset: 'embers',
    });
  });

  it('renders and stores the Snow preset', () => {
    const { api, controls } = activateParticlesHarness();

    controls.querySelector<HTMLButtonElement>('[aria-label="Toggle Snow background effect"]')?.click();

    expect(api.setPluginData).toHaveBeenCalledWith({
      enabled: true,
      preset: 'snow',
    });
    expect(startBackgroundParticleEffect).toHaveBeenLastCalledWith(expect.objectContaining({
      color: '#f8fafc',
      preset: 'snow',
      prewarmSeconds: 0,
    }));
  });

  it('uses a darker default particle color on light graph backgrounds', () => {
    const { controls } = activateParticlesHarness(undefined, {
      overlayBackground: 'rgb(245, 239, 224)',
    });

    controls.querySelector<HTMLButtonElement>('[aria-label="Toggle Perlin Flow background effect"]')?.click();

    expect(startBackgroundParticleEffect).toHaveBeenLastCalledWith(expect.objectContaining({
      color: '#256f7a',
      preset: 'perlin-flow',
    }));
  });

  it('refreshes persisted plugin data after activation so launch settings start immediately', () => {
    vi.useFakeTimers();
    const pluginDataRef: { current?: unknown } = {};
    const { controls } = activateParticlesHarness(() => pluginDataRef.current);

    pluginDataRef.current = {
      enabled: true,
      preset: 'embers',
      intensity: 1,
    };
    vi.runOnlyPendingTimers();

    expect(
      controls.querySelector('[aria-label="Toggle Embers background effect"]')
        ?.getAttribute('data-state'),
    ).toBe('checked');
    expect(startBackgroundParticleEffect).toHaveBeenCalledWith(expect.objectContaining({
      preset: 'embers',
    }));
  });

  it('renders compiled custom particle effects from plugin webview assets', () => {
    const { api, controls, sendPluginMessage } = activateParticlesHarness(undefined, {
      captureMessages: true,
    });

    sendPluginMessage({
      type: 'PLUGIN_WEBVIEW_ASSETS_UPDATED',
      data: [
        {
          id: 'fireflies',
          label: 'Fireflies',
          url: 'data:text/javascript,export function activateParticleEffect(){}',
          kind: 'particle-effect',
        },
      ],
    });
    controls.querySelector<HTMLButtonElement>(
      '[aria-label="Toggle Fireflies custom background effect"]',
    )?.click();

    expect(api.setPluginData).toHaveBeenCalledWith({
      enabled: true,
      preset: 'custom',
      customEffectId: 'fireflies',
    });
    sendPluginMessage({
      type: 'PLUGIN_DATA_UPDATED',
      data: {
        enabled: true,
        preset: 'custom',
        customEffectId: 'fireflies',
      },
    });
    expect(startCustomParticleEffect).toHaveBeenCalledWith(expect.objectContaining({
      moduleUrl: 'data:text/javascript,export function activateParticleEffect(){}',
    }));
  });

  it('shows a selected custom effect toggle from persisted settings before asset urls arrive', () => {
    const { controls } = activateParticlesHarness({
      enabled: true,
      preset: 'custom',
      customEffectId: 'fireflies',
    });

    expect(
      controls.querySelector('[aria-label="Toggle Fireflies custom background effect"]')
        ?.getAttribute('data-state'),
    ).toBe('checked');
    expect(startCustomParticleEffect).not.toHaveBeenCalled();
  });

  it('starts a custom particle effect when asset urls arrive after plugin data', () => {
    const { controls, sendPluginMessage } = activateParticlesHarness(undefined, {
      captureMessages: true,
    });

    sendPluginMessage({
      type: 'PLUGIN_DATA_UPDATED',
      data: {
        enabled: true,
        preset: 'custom',
        customEffectId: 'fireflies',
      },
    });

    expect(startCustomParticleEffect).not.toHaveBeenCalled();

    sendPluginMessage({
      type: 'PLUGIN_WEBVIEW_ASSETS_UPDATED',
      data: [
        {
          id: 'fireflies',
          label: 'Fireflies',
          url: 'data:text/javascript,export function activateParticleEffect(){}',
          kind: 'particle-effect',
        },
      ],
    });

    expect(startCustomParticleEffect).toHaveBeenCalledWith(expect.objectContaining({
      moduleUrl: 'data:text/javascript,export function activateParticleEffect(){}',
    }));
    expect(
      controls.querySelector('[aria-label="Toggle Fireflies custom background effect"]')
        ?.getAttribute('data-state'),
    ).toBe('checked');
  });

  it('cleans up active particle work when the plugin is disposed', () => {
    const cleanup = vi.fn();
    vi.mocked(startBackgroundParticleEffect).mockReturnValueOnce(cleanup);
    const messageSubscription = { dispose: vi.fn() };
    const { controls, dispose, overlay } = activateParticlesHarness({
      enabled: true,
      preset: 'leaves',
      intensity: 1,
    }, {
      messageSubscription,
    });

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

function screenText(container: HTMLElement): string {
  return container.textContent ?? '';
}

interface ParticlesHarnessOptions {
  captureMessages?: boolean;
  messageSubscription?: { dispose(): void };
  overlayBackground?: string;
}

function activateParticlesHarness(
  pluginData: unknown | (() => unknown) = undefined,
  options: ParticlesHarnessOptions = {},
): {
  api: CodeGraphyWebviewAPI;
  controls: HTMLDivElement;
  dispose: () => void;
  overlay: HTMLDivElement;
  sendPluginMessage(message: { type: string; data: unknown }): void;
} {
  const controls = document.createElement('div');
  const overlay = document.createElement('div');
  if (options.overlayBackground) {
    overlay.style.backgroundColor = options.overlayBackground;
  }

  const handlers: Array<(message: { type: string; data: unknown }) => void> = [];
  const api = createWebviewApi({
    'theme.panel': controls,
    'graph.stage.worldBackground': overlay,
  }, pluginData);
  if (options.captureMessages) {
    vi.mocked(api.onMessage).mockImplementation((handler) => {
      handlers.push(handler);
      return { dispose: vi.fn() };
    });
  }
  if (options.messageSubscription) {
    vi.mocked(api.onMessage).mockReturnValueOnce(options.messageSubscription);
  }

  const dispose = activate(api);
  return {
    api,
    controls,
    dispose,
    overlay,
    sendPluginMessage(message) {
      handlers[0]?.(message);
    },
  };
}

beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

function createWebviewApi(
  slots: Partial<Record<GraphPluginSlot, HTMLElement>>,
  pluginData: unknown | (() => unknown) = undefined,
): CodeGraphyWebviewAPI {
  return {
    getContainer: vi.fn(() => document.createElement('div')),
    getSlotContainer: vi.fn((slot: GraphPluginSlot) => slots[slot]),
    registerSlotContribution: vi.fn((slot, contribution) => {
      const container = slots[slot] as HTMLDivElement | undefined;
      if (!container) {
        return { dispose: vi.fn() };
      }
      const cleanup = contribution.render(container, { api: undefined as unknown as CodeGraphyWebviewAPI });
      const dispose = vi.fn(() => {
        if (typeof cleanup === 'function') {
          cleanup();
        } else {
          cleanup?.dispose();
        }
        container.replaceChildren();
      });
      return { dispose };
    }),
    getHostState: vi.fn(() => ({})),
    getPluginData: vi.fn(() => typeof pluginData === 'function' ? pluginData() : pluginData),
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
