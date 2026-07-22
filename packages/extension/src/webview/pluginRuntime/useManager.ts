/**
 * @fileoverview Hook that manages Tier-2 plugin lifecycle in the webview.
 * @module webview/usePluginManager
 */

import { useMemo, useRef } from 'react';
import type { PluginInjectPayload } from '../app/shell/messages';
import type { CodeGraphyWebviewAPI } from '../pluginHost/api/contracts/webview';
import { WebviewPluginHost } from '../pluginHost/manager';
import { activatePluginScript, resetPluginScriptState } from './scripts';
import { injectPluginStyle, resetPluginStyles } from './styles';
import type { IPluginManager, LoadedPluginStyle, PluginManagerRefs } from './types';

export type { IPluginManager } from './types';

export function usePluginManager(): IPluginManager {
  const pluginHostRef = useRef<WebviewPluginHost>(new WebviewPluginHost());
  const pluginApisRef = useRef<Map<string, CodeGraphyWebviewAPI>>(new Map());
  const loadedStylesRef = useRef<Map<string, LoadedPluginStyle>>(new Map());
  const activatedScriptKeysRef = useRef<Set<string>>(new Set());
  const activatingScriptPromisesRef = useRef<Map<string, Promise<void>>>(new Map());
  const pluginActivationCleanupsRef = useRef<Map<string, Set<{ dispose(): void }>>>(new Map());
  const pluginAssetVersionsRef = useRef<Map<string, number>>(new Map());
  const pluginAssetRevisionsRef = useRef<Map<string, string>>(new Map());
  const pluginStylesRef = useRef<Map<string, Set<string>>>(new Map());
  const pluginDataRef = useRef<Map<string, unknown>>(new Map());

  return useMemo(() => {
    const refs: PluginManagerRefs = {
      activatedScriptKeys: activatedScriptKeysRef,
      activatingScriptPromises: activatingScriptPromisesRef,
      loadedStyles: loadedStylesRef,
      pluginActivationCleanups: pluginActivationCleanupsRef,
      pluginApis: pluginApisRef,
      pluginAssetVersions: pluginAssetVersionsRef,
      pluginAssetRevisions: pluginAssetRevisionsRef,
      pluginStyles: pluginStylesRef,
      pluginData: pluginDataRef,
      pluginHost: pluginHostRef,
    };

    async function injectPluginAssets(payload: PluginInjectPayload): Promise<void> {
      const currentRevision = pluginAssetRevisionsRef.current.get(payload.pluginId);
      if (payload.revision && currentRevision && payload.revision !== currentRevision) {
        resetPluginAssets(payload.pluginId);
      }
      if (payload.revision) {
        pluginAssetRevisionsRef.current.set(payload.pluginId, payload.revision);
      }
      for (const style of payload.styles) injectPluginStyle(refs, payload.pluginId, style);
      for (const script of payload.scripts) {
        try {
          await activatePluginScript(refs, payload.pluginId, script);
        } catch (error) {
          console.error(`[CodeGraphy] Failed to activate webview plugin script "${script}":`, error);
        }
      }
      if (payload.assets?.length) {
        pluginHostRef.current.deliverMessage(payload.pluginId, {
          type: 'PLUGIN_WEBVIEW_ASSETS_UPDATED',
          data: payload.assets,
        });
      }
    }

    function resetPluginAssets(pluginId: string): void {
      pluginApisRef.current.delete(pluginId);
      pluginAssetRevisionsRef.current.delete(pluginId);
      pluginAssetVersionsRef.current.set(
        pluginId,
        (pluginAssetVersionsRef.current.get(pluginId) ?? 0) + 1,
      );
      resetPluginScriptState(refs, pluginId);
      resetPluginStyles(refs, pluginId);
    }

    function updatePluginData(pluginId: string, data: unknown): void {
      pluginDataRef.current.set(pluginId, data);
      pluginHostRef.current.deliverMessage(pluginId, { type: 'PLUGIN_DATA_UPDATED', data });
    }

    return {
      pluginHost: pluginHostRef.current,
      injectPluginAssets,
      resetPluginAssets,
      updatePluginData,
    };
  }, []);
}
