/**
 * @fileoverview Hook for managing Tier 2 webview plugin lifecycle.
 * Handles plugin API creation, script activation, and asset injection.
 */

import { useRef, useCallback } from 'react';
import { WebviewPluginHost } from '../pluginHost';
import type { CodeGraphyWebviewAPI } from '../pluginHost/types';
import { postMessage } from '../lib/vscodeApi';

interface PluginWebviewModule {
  activate?: (api: CodeGraphyWebviewAPI) => void | Promise<void>;
  default?: ((api: CodeGraphyWebviewAPI) => void | Promise<void>) | {
    activate?: (api: CodeGraphyWebviewAPI) => void | Promise<void>;
  };
}

export interface PluginInjectPayload {
  pluginId: string;
  scripts: string[];
  styles: string[];
}

export interface UsePluginManagerResult {
  /** The shared plugin host instance (stable across renders). */
  pluginHost: WebviewPluginHost;
  getPluginApi: (pluginId: string) => CodeGraphyWebviewAPI;
  injectPluginAssets: (payload: PluginInjectPayload) => Promise<void>;
}

/**
 * Manages Tier 2 plugin APIs, script activation, and CSS injection.
 */
export function usePluginManager(): UsePluginManagerResult {
  // Store the host in a ref so it is created once and stable for the lifetime of the component
  const pluginHostRef = useRef<WebviewPluginHost | null>(null);
  if (pluginHostRef.current === null) {
    pluginHostRef.current = new WebviewPluginHost();
  }
  const pluginHost = pluginHostRef.current;

  const pluginApisRef = useRef<Map<string, CodeGraphyWebviewAPI>>(new Map());
  const loadedStylesRef = useRef<Set<string>>(new Set());
  const activatedScriptKeysRef = useRef<Set<string>>(new Set());

  const getPluginApi = useCallback((pluginId: string): CodeGraphyWebviewAPI => {
    const existing = pluginApisRef.current.get(pluginId);
    if (existing) {
      return existing;
    }

    const api = pluginHost.createAPI(pluginId, postMessage);
    pluginApisRef.current.set(pluginId, api);
    return api;
  }, [pluginHost]);

  const activatePluginScript = useCallback(async (pluginId: string, script: string): Promise<void> => {
    const activationKey = `${pluginId}::${script}`;
    if (activatedScriptKeysRef.current.has(activationKey)) {
      return;
    }

    const mod = (await import(/* @vite-ignore */ script)) as PluginWebviewModule;
    const candidate = mod.activate ?? mod.default;
    const activate = typeof candidate === 'function'
      ? candidate
      : (candidate && typeof candidate === 'object' && 'activate' in candidate
          ? candidate.activate
          : undefined);

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

  return { pluginHost, getPluginApi, injectPluginAssets };
}
