/**
 * @fileoverview Plugin registry for managing CodeGraphy plugins.
 * @module core/plugins/registry/manager
 */

import type {
  IPlugin,
} from '../types/contracts';
import { PluginRegistryLifecycle } from './runtime/state/lifecycle';
import { validateAndCreatePluginInfo, addToRegistry } from './runtime/registration/register';
import { removeFromRegistry, unloadPlugin } from './runtime/registration/unregister';

export class PluginRegistry extends PluginRegistryLifecycle {
  register(
    plugin: IPlugin,
    options: {
      builtIn?: boolean;
      sourceExtension?: string;
      sourcePackage?: string;
      sourcePackageRoot?: string;
      descriptorSignature?: string;
      sourceSignature?: string;
      options?: Record<string, unknown>;
    } = {},
  ): void {
    if (this._plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID '${plugin.id}' is already registered`);
    }
    const info = validateAndCreatePluginInfo(plugin, options);
    addToRegistry(info, this._plugins, this._extensionMap);
  }

  unregister(pluginId: string): boolean {
    const info = this._plugins.get(pluginId);
    if (!info) return false;
    const initialization = this._initializingPlugins.get(info);
    const removed = removeFromRegistry(
      pluginId,
      this._plugins,
      this._extensionMap,
      this._initializedPlugins,
    );
    if (removed) {
      this._queuePluginUnload(() => unloadPlugin(info), initialization);
    }
    return removed;
  }

}
