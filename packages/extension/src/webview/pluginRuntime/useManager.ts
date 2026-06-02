/**
 * @fileoverview Hook that manages Tier-2 plugin lifecycle in the webview.
 * Handles asset injection (scripts/styles) and the plugin host API.
 * @module webview/usePluginManager
 */

import { useRef, useMemo, type MutableRefObject } from 'react';
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

interface PluginManagerRefs {
  activatedScriptKeys: MutableRefObject<Set<string>>;
  activatingScriptPromises: MutableRefObject<Map<string, Promise<void>>>;
  loadedStyles: MutableRefObject<Set<string>>;
  pluginApis: MutableRefObject<Map<string, CodeGraphyWebviewAPI>>;
  pluginAssetVersions: MutableRefObject<Map<string, number>>;
  pluginHost: MutableRefObject<WebviewPluginHost>;
}

function getPluginApi(refs: Pick<PluginManagerRefs, 'pluginApis' | 'pluginHost'>, pluginId: string): CodeGraphyWebviewAPI {
  const existing = refs.pluginApis.current.get(pluginId);
  if (existing) return existing;
  const api = refs.pluginHost.current.createAPI(pluginId, postMessage);
  refs.pluginApis.current.set(pluginId, api);
  return api;
}

function injectPluginStyle(refs: Pick<PluginManagerRefs, 'loadedStyles'>, style: string): void {
  if (refs.loadedStyles.current.has(style)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = style;
  document.head.appendChild(link);
  refs.loadedStyles.current.add(style);
}

async function runPluginActivation(
  refs: Pick<PluginManagerRefs, 'pluginApis' | 'pluginAssetVersions' | 'pluginHost'>,
  pluginId: string,
  script: string,
  activationKey: string,
  activationVersion: number,
): Promise<boolean> {
  const mod = (await import(/* @vite-ignore */ script)) as unknown;
  const activate = resolvePluginModuleActivator(mod as PluginWebviewModule);

  if (typeof activate !== 'function') {
    console.warn(`[CodeGraphy] Webview plugin script "${script}" has no activate(api) export`);
    return false;
  }

  if ((refs.pluginAssetVersions.current.get(pluginId) ?? 0) !== activationVersion) {
    return false;
  }

  await activate(getPluginApi(refs, pluginId));
  return (refs.pluginAssetVersions.current.get(pluginId) ?? 0) === activationVersion
    && Boolean(activationKey);
}

async function activatePluginScript(
  refs: Pick<
    PluginManagerRefs,
    'activatedScriptKeys' | 'activatingScriptPromises' | 'pluginApis' | 'pluginAssetVersions' | 'pluginHost'
  >,
  pluginId: string,
  script: string,
): Promise<void> {
  const activationKey = `${pluginId}::${script}`;
  if (refs.activatedScriptKeys.current.has(activationKey)) return;

  const pendingActivation = refs.activatingScriptPromises.current.get(activationKey);
  if (pendingActivation) {
    await pendingActivation;
    return;
  }

  const activationVersion = refs.pluginAssetVersions.current.get(pluginId) ?? 0;
  const activationPromise = runPluginActivation(
    refs,
    pluginId,
    script,
    activationKey,
    activationVersion,
  ).then((activated) => {
    if (activated) {
      refs.activatedScriptKeys.current.add(activationKey);
    }
  });

  refs.activatingScriptPromises.current.set(activationKey, activationPromise);
  try {
    await activationPromise;
  } finally {
    refs.activatingScriptPromises.current.delete(activationKey);
  }
}

function resetPluginScriptState(
  refs: Pick<PluginManagerRefs, 'activatedScriptKeys' | 'activatingScriptPromises'>,
  pluginId: string,
): void {
  const activationPrefix = `${pluginId}::`;
  for (const key of Array.from(refs.activatedScriptKeys.current)) {
    if (key.startsWith(activationPrefix)) {
      refs.activatedScriptKeys.current.delete(key);
    }
  }
  for (const key of Array.from(refs.activatingScriptPromises.current.keys())) {
    if (key.startsWith(activationPrefix)) {
      refs.activatingScriptPromises.current.delete(key);
    }
  }
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
    const refs: PluginManagerRefs = {
      activatedScriptKeys: activatedScriptKeysRef,
      activatingScriptPromises: activatingScriptPromisesRef,
      loadedStyles: loadedStylesRef,
      pluginApis: pluginApisRef,
      pluginAssetVersions: pluginAssetVersionsRef,
      pluginHost: pluginHostRef,
    };

    async function injectPluginAssets(payload: PluginInjectPayload): Promise<void> {
      for (const style of payload.styles) {
        injectPluginStyle(refs, style);
      }

      for (const script of payload.scripts) {
        try {
          await activatePluginScript(refs, payload.pluginId, script);
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
      resetPluginScriptState(refs, pluginId);
    }

    return {
      pluginHost: pluginHostRef.current,
      injectPluginAssets,
      resetPluginAssets,
    };
  // All state is in refs — no dependencies needed
  }, []);
}
