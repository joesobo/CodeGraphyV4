/**
 * @fileoverview Hook that manages Tier-2 plugin lifecycle in the webview.
 * Handles asset injection (scripts/styles) and the plugin host API.
 * @module webview/usePluginManager
 */

import { useRef, useMemo } from 'react';
import { WebviewPluginHost } from '../pluginHost/manager';
import type { CodeGraphyWebviewAPI } from '../pluginHost/api/contracts/webview';
import { postMessage } from '../vscodeApi';
import {
  resolvePluginModuleActivator,
  PluginWebviewModule,
  PluginInjectPayload,
} from '../app/shell/messages';

export interface IPluginManager {
  pluginHost: WebviewPluginHost;
  injectPluginAssets: (payload: PluginInjectPayload) => Promise<void>;
  resetPluginAssets: (pluginId: string) => void;
}

/**
 * Manages webview plugin lifecycle: API creation, style injection, script activation.
 * Returns stable references via useRef/useMemo — safe to pass as props.
 */
export function usePluginManager(): IPluginManager {
  const pluginHostRef = useRef<WebviewPluginHost>(new WebviewPluginHost());
  const pluginApisRef = useRef<Map<string, CodeGraphyWebviewAPI>>(new Map());
  const loadedStylesRef = useRef<Set<string>>(new Set());
  const activatedScriptKeysRef = useRef<Set<string>>(new Set());
  const activatingScriptPromisesRef = useRef<Map<string, Promise<void>>>(new Map());
  const pluginAssetVersionsRef = useRef<Map<string, number>>(new Map());

  return useMemo(() => {
    function getPluginApi(pluginId: string): CodeGraphyWebviewAPI {
      const existing = pluginApisRef.current.get(pluginId);
      if (existing) return existing;
      const api = pluginHostRef.current.createAPI(pluginId, postMessage);
      pluginApisRef.current.set(pluginId, api);
      return api;
    }

    async function activatePluginScript(pluginId: string, script: string): Promise<void> {
      const activationKey = `${pluginId}::${script}`;
      if (activatedScriptKeysRef.current.has(activationKey)) return;

      const pendingActivation = activatingScriptPromisesRef.current.get(activationKey);
      if (pendingActivation) {
        await pendingActivation;
        return;
      }

      const activationVersion = pluginAssetVersionsRef.current.get(pluginId) ?? 0;
      const activationPromise = (async (): Promise<void> => {
        const mod = (await import(/* @vite-ignore */ script)) as unknown;
        const activate = resolvePluginModuleActivator(mod as PluginWebviewModule);

        if (typeof activate !== 'function') {
          console.warn(`[CodeGraphy] Webview plugin script "${script}" has no activate(api) export`);
          return;
        }

        if ((pluginAssetVersionsRef.current.get(pluginId) ?? 0) !== activationVersion) {
          return;
        }

        await activate(getPluginApi(pluginId));
        if ((pluginAssetVersionsRef.current.get(pluginId) ?? 0) === activationVersion) {
          activatedScriptKeysRef.current.add(activationKey);
        }
      })();

      activatingScriptPromisesRef.current.set(activationKey, activationPromise);
      try {
        await activationPromise;
      } finally {
        activatingScriptPromisesRef.current.delete(activationKey);
      }
    }

    async function injectPluginAssets(payload: PluginInjectPayload): Promise<void> {
      for (const style of payload.styles) {
        if (loadedStylesRef.current.has(style)) continue;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = style;
        document.head.appendChild(link);
        loadedStylesRef.current.add(style);
      }

      for (const script of payload.scripts) {
        try {
          await activatePluginScript(payload.pluginId, script);
        } catch (error) {
          console.error(`[CodeGraphy] Failed to activate webview plugin script "${script}":`, error);
        }
      }
    }

    function resetPluginAssets(pluginId: string): void {
      pluginApisRef.current.delete(pluginId);
      pluginAssetVersionsRef.current.set(
        pluginId,
        (pluginAssetVersionsRef.current.get(pluginId) ?? 0) + 1,
      );
      const activationPrefix = `${pluginId}::`;
      for (const key of Array.from(activatedScriptKeysRef.current)) {
        if (key.startsWith(activationPrefix)) {
          activatedScriptKeysRef.current.delete(key);
        }
      }
      for (const key of Array.from(activatingScriptPromisesRef.current.keys())) {
        if (key.startsWith(activationPrefix)) {
          activatingScriptPromisesRef.current.delete(key);
        }
      }
    }

    return {
      pluginHost: pluginHostRef.current,
      injectPluginAssets,
      resetPluginAssets,
    };
  // All state is in refs — no dependencies needed
  }, []);
}
