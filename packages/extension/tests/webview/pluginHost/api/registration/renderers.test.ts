import { describe, expect, it, vi } from 'vitest';
import {
  registerNodeRenderer,
  registerOverlay,
  registerTooltipProvider,
} from '../../../../../src/webview/pluginHost/api/registration/renderers';

describe('pluginHost/api/registration/renderers', () => {
  it('registers and disposes node renderers by plugin ownership', () => {
    const renderers = new Map<string, { pluginId: string; fn: () => void }>();
    const fn = vi.fn();
    const disposable = registerNodeRenderer('plugin-a', '.ts', fn, renderers as never);

    expect(renderers.get('.ts')).toEqual({ pluginId: 'plugin-a', fn });
    disposable.dispose();
    expect(renderers.has('.ts')).toBe(false);
  });

  it('does not throw when a node renderer is already missing on dispose', () => {
    const renderers = new Map<string, { pluginId: string; fn: () => void }>();
    const disposable = registerNodeRenderer('plugin-a', '.ts', vi.fn(), renderers as never);

    renderers.delete('.ts');

    expect(() => disposable.dispose()).not.toThrow();
  });

  it('registers overlays with qualified ids and tooltip providers in order', () => {
    const overlays = new Map<string, { pluginId: string; fn: () => void }>();
    const overlayFn = vi.fn();
    const overlayDisposable = registerOverlay('plugin-a', 'heatmap', overlayFn, overlays as never);
    expect(overlays.has('plugin-a:heatmap')).toBe(true);
    expect(overlays.get('plugin-a:heatmap')).toEqual({ pluginId: 'plugin-a', fn: overlayFn });
    overlayDisposable.dispose();
    expect(overlays.has('plugin-a:heatmap')).toBe(false);

    const providers: Array<{ pluginId: string; fn: () => null }> = [];
    const providerFn = vi.fn(() => null);
    const providerDisposable = registerTooltipProvider('plugin-a', providerFn, providers as never);
    expect(providers).toHaveLength(1);
    expect(providers[0]).toEqual({ pluginId: 'plugin-a', fn: providerFn });
    providerDisposable.dispose();
    expect(providers).toHaveLength(0);
  });

  it('does not remove another tooltip provider when the entry is already missing', () => {
    const providers: Array<{ pluginId: string; fn: () => null }> = [];
    const first = registerTooltipProvider('plugin-a', vi.fn(() => null), providers as never);
    const second = registerTooltipProvider('plugin-b', vi.fn(() => null), providers as never);

    providers.shift();
    first.dispose();

    expect(providers).toHaveLength(1);
    expect(providers[0]?.pluginId).toBe('plugin-b');

    second.dispose();
  });
});
