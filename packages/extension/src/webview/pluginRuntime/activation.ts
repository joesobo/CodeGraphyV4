import type { MutableRefObject } from 'react';
import type { CodeGraphyWebviewAPI } from '../pluginHost/api/contracts/webview';
import {
  normalizePluginActivationCleanup,
  resolvePluginModuleActivator,
  type PluginWebviewModule,
} from '../app/shell/messages';

interface ActivationRuntime {
  cleanups: MutableRefObject<Map<string, Set<{ dispose(): void }>>>;
  getApi(): CodeGraphyWebviewAPI;
  versions: MutableRefObject<Map<string, number>>;
}

function currentVersion(runtime: ActivationRuntime, pluginId: string, version: number): boolean {
  return (runtime.versions.current.get(pluginId) ?? 0) === version;
}

function storeCleanup(runtime: ActivationRuntime, pluginId: string, cleanup: { dispose(): void } | undefined): void {
  if (!cleanup) return;
  const cleanups = runtime.cleanups.current.get(pluginId) ?? new Set();
  cleanups.add(cleanup);
  runtime.cleanups.current.set(pluginId, cleanups);
}

export async function runPluginActivation(
  runtime: ActivationRuntime,
  pluginId: string,
  script: string,
  activationKey: string,
  activationVersion: number,
): Promise<boolean> {
  const module = (await import(/* @vite-ignore */ script)) as PluginWebviewModule;
  const activate = resolvePluginModuleActivator(module);
  if (typeof activate !== 'function') {
    console.warn(`[CodeGraphy] Webview plugin script "${script}" has no activate(api) export`);
    return false;
  }
  if (!currentVersion(runtime, pluginId, activationVersion)) return false;
  const cleanup = normalizePluginActivationCleanup(await activate(runtime.getApi()));
  if (!currentVersion(runtime, pluginId, activationVersion)) {
    cleanup?.dispose();
    return false;
  }
  storeCleanup(runtime, pluginId, cleanup);
  return currentVersion(runtime, pluginId, activationVersion) && Boolean(activationKey);
}
