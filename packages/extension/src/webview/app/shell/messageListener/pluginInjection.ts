import { graphStore } from '../../../store/state';
import { normalizePluginInjectPayload } from '../messages';
import type { InjectAssetsParams } from '../messageListener';

export function handlePluginInjectMessage(
  raw: { type?: unknown; payload?: unknown },
  injectPluginAssets: (params: InjectAssetsParams) => Promise<void>,
): boolean {
  if (raw.type !== 'PLUGIN_WEBVIEW_INJECT') {
    return false;
  }

  const payload = normalizePluginInjectPayload(raw.payload);
  if (payload) {
    const store = graphStore.getState();
    store.beginPluginAssetLoad();
    void injectPluginAssets({
      pluginId: payload.pluginId,
      ...(payload.revision ? { revision: payload.revision } : {}),
      scripts: payload.scripts,
      styles: payload.styles,
      assets: payload.assets,
    }).finally(() => {
      graphStore.getState().finishPluginAssetLoad();
    });
  }

  return true;
}
