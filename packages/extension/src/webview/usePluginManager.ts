/**
 * @fileoverview Hook that manages Tier-2 plugin lifecycle in the webview.
 * Handles asset injection (scripts/styles) and the plugin host API.
 * @module webview/usePluginManager
 */

import { useRef, useCallback } from 'react';
import { WebviewPluginHost } from './pluginHost';
import type { CodeGraphyWebviewAPI } from './pluginHost/types';
import { postMessage } from './vscodeApi';
import {
  resolvePluginModuleActivator,
  PluginWebviewModule,
  PluginInjectPayload,
} from './appMessages';

export interface IPluginManager {
  pluginHost: WebviewPluginHost;
  injectPluginAssets: (payload: PluginInjectPayload) => Promise<void>;
}

/**
 * Manages webview plugin lifecycle: API creation, style injection, script activation.
 * Returns stable references via useRef/useCallback — safe to pass as props.
 */
export function usePluginManager(): IPluginManager {
  const pluginHostRef = useRef<WebviewPluginHost>(new WebviewPluginHost());
  const pluginApisRef = useRef<Map<string, CodeGraphyWebviewAPI>>(new Map());
  const loadedStylesRef = useRef<Set<string>>(new Set());
  const activatedScriptKeysRef = useRef<Set<string>>(new Set());

  const getPluginApi = useCallback((pluginId: string): CodeGraphyWebviewAPI => {
    const existing = pluginApisRef.current.get(pluginId);
    if (existing) return existing;
    const api = pluginHostRef.current.createAPI(pluginId, postMessage);
    pluginApisRef.current.set(pluginId, api);
    return api;
  }, []);

  const activatePluginScript = useCallback(async (pluginId: string, script: string): Promise<void> => {
    const activationKey = `${pluginId}::${script}`;
    if (activatedScriptKeysRef.current.has(activationKey)) return;

    const mod = (await import(/* @vite-ignore */ script)) as unknown;
    const activate = resolvePluginModuleActivator(mod as PluginWebviewModule);

    if (typeof activate !== 'function') {
      console.warn(`[CodeGraphy] Webview plugin script "${script}" has no activate(api) export`);
      return;
    }

    await activate(getPluginApi(pluginId));
    activatedScriptKeysRef.current.add(activationKey);
  }, [getPluginApi]);

  const injectPluginAssets = useCallback(async (payload: PluginInjectPayload): Promise<void> => {
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
  }, [activatePluginScript]);

  return {
    pluginHost: pluginHostRef.current,
    injectPluginAssets,
  };
}
