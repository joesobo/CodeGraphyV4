/**
 * @fileoverview Plugin module activation resolution.
 * @module webview/pluginModuleResolver
 */

import type { CodeGraphyWebviewAPI } from './pluginHost/types';

export interface PluginWebviewModule {
  activate?: (api: CodeGraphyWebviewAPI) => void | Promise<void>;
  default?:
    | ((api: CodeGraphyWebviewAPI) => void | Promise<void>)
    | { activate?: (api: CodeGraphyWebviewAPI) => void | Promise<void> };
}

export function resolvePluginModuleActivator(
  mod: PluginWebviewModule,
): ((api: CodeGraphyWebviewAPI) => void | Promise<void>) | undefined {
  const candidate = mod.activate ?? mod.default;
  if (typeof candidate === 'function') {
    return candidate;
  }

  if (candidate && typeof candidate === 'object' && 'activate' in candidate) {
    return candidate.activate;
  }

  return undefined;
}
