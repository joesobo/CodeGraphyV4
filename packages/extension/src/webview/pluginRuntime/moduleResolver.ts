/**
 * @fileoverview Plugin module activation resolution.
 * @module webview/pluginModuleResolver
 */

import type { CodeGraphyWebviewAPI } from '../pluginHost/api/contracts/webview';

export type PluginActivationCleanup = void | (() => void) | { dispose(): void };

export interface PluginWebviewModule {
  activate?: (api: CodeGraphyWebviewAPI) => PluginActivationCleanup | Promise<PluginActivationCleanup>;
  default?:
    | ((api: CodeGraphyWebviewAPI) => PluginActivationCleanup | Promise<PluginActivationCleanup>)
    | { activate?: (api: CodeGraphyWebviewAPI) => PluginActivationCleanup | Promise<PluginActivationCleanup> };
}

export function resolvePluginModuleActivator(
  mod: PluginWebviewModule,
): ((api: CodeGraphyWebviewAPI) => PluginActivationCleanup | Promise<PluginActivationCleanup>) | undefined {
  const candidate = mod.activate ?? mod.default;
  if (typeof candidate === 'function') {
    return candidate;
  }

  if (candidate && typeof candidate === 'object' && 'activate' in candidate) {
    return candidate.activate;
  }

  return undefined;
}

export function normalizePluginActivationCleanup(value: unknown): { dispose(): void } | undefined {
  if (typeof value === 'function') {
    return { dispose: value as () => void };
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as { dispose?: unknown };
  return typeof candidate.dispose === 'function'
    ? candidate as { dispose(): void }
    : undefined;
}
