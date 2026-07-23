import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { satisfiesSemverRange } from './apiVersion';
import { CORE_PLUGIN_API_VERSION } from './api';

export function assertPluginDescriptorApiCompatibility(
  pluginId: string,
  apiVersion: string,
): void {
  if (!satisfiesSemverRange(CORE_PLUGIN_API_VERSION, apiVersion)) {
    throw new Error(
      `Plugin descriptor '${pluginId}' targets unsupported CodeGraphy Plugin API '${apiVersion}'. `
      + `Host provides '${CORE_PLUGIN_API_VERSION}'.`,
    );
  }
}

export function assertPluginApiCompatibility(plugin: IPlugin): void {
  if (typeof plugin.apiVersion !== 'string') {
    throw new Error(
      `Plugin '${plugin.id}' must declare a string apiVersion (for example '^${CORE_PLUGIN_API_VERSION}').`,
    );
  }

  if (!satisfiesSemverRange(CORE_PLUGIN_API_VERSION, plugin.apiVersion)) {
    throw new Error(
      `Plugin '${plugin.id}' targets unsupported CodeGraphy Plugin API '${plugin.apiVersion}'. ` +
      `Host provides '${CORE_PLUGIN_API_VERSION}'.`,
    );
  }
}
