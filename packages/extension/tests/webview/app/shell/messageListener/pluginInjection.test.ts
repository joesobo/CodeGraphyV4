import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlePluginInjectMessage } from '../../../../../src/webview/app/shell/messageListener/pluginInjection';
import { graphStore } from '../../../../../src/webview/store/state';

describe('app/shell/messageListener/pluginInjection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false for non-inject messages', () => {
    expect(handlePluginInjectMessage(
      { type: 'GRAPH_DATA_UPDATED' },
      vi.fn(),
      new Set<string>(),
    )).toBe(false);
  });

  it('handles invalid inject payloads without forwarding to the graph store', () => {
    const injectPluginAssets = vi.fn().mockResolvedValue(undefined);
    const beginPluginAssetLoad = vi.fn();
    const finishPluginAssetLoad = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      beginPluginAssetLoad,
      finishPluginAssetLoad,
    } as unknown as ReturnType<typeof graphStore.getState>);

    expect(handlePluginInjectMessage({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: { scripts: ['one.js'] },
    }, injectPluginAssets, new Set<string>())).toBe(true);

    expect(injectPluginAssets).not.toHaveBeenCalled();
    expect(beginPluginAssetLoad).not.toHaveBeenCalled();
    expect(finishPluginAssetLoad).not.toHaveBeenCalled();
  });

  it('loads normalized plugin assets and finishes loading after the promise settles', async () => {
    const injectPluginAssets = vi.fn().mockResolvedValue(undefined);
    const beginPluginAssetLoad = vi.fn();
    const finishPluginAssetLoad = vi.fn();
    const knownPluginIds = new Set<string>();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      beginPluginAssetLoad,
      finishPluginAssetLoad,
    } as unknown as ReturnType<typeof graphStore.getState>);

    expect(handlePluginInjectMessage({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: {
        pluginId: 'codegraphy.organize',
        scripts: ['organize.js', 123],
        styles: ['organize.css', null],
        assets: [
          { id: 'fireflies', label: 'Fireflies', url: 'webview://fireflies.js' },
        ],
      },
    }, injectPluginAssets, knownPluginIds)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(beginPluginAssetLoad).toHaveBeenCalledOnce();
    expect(injectPluginAssets).toHaveBeenCalledWith({
      pluginId: 'codegraphy.organize',
      scripts: ['organize.js'],
      styles: ['organize.css'],
      assets: [
        { id: 'fireflies', label: 'Fireflies', url: 'webview://fireflies.js' },
      ],
    });
    expect(finishPluginAssetLoad).toHaveBeenCalledOnce();
    expect(knownPluginIds).toEqual(new Set(['codegraphy.organize']));
  });

  it('reports a rejected asset load and still finishes loading', async () => {
    const error = new Error('style load failed');
    const injectPluginAssets = vi.fn().mockRejectedValue(error);
    const beginPluginAssetLoad = vi.fn();
    const finishPluginAssetLoad = vi.fn();
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      beginPluginAssetLoad,
      finishPluginAssetLoad,
    } as unknown as ReturnType<typeof graphStore.getState>);

    expect(handlePluginInjectMessage({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: {
        pluginId: 'acme.broken-style',
        styles: ['broken.css'],
      },
    }, injectPluginAssets, new Set<string>())).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(logError).toHaveBeenCalledWith(
      "[CodeGraphy] Failed to load webview assets for plugin 'acme.broken-style':",
      error,
    );
    expect(finishPluginAssetLoad).toHaveBeenCalledOnce();
  });
});
