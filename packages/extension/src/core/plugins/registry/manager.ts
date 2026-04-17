/**
 * @fileoverview Plugin registry for managing CodeGraphy plugins.
 * @module core/plugins/registry/manager
 */

import type {
  IPlugin,
} from '../types/contracts';
import { buildV2Config } from './runtime/configure';
import { PluginRegistryLifecycle } from './runtime/lifecycle';
import { validateAndCreatePluginInfo, addToRegistry } from './runtime/register';
import type { ConfigureV2Options } from './runtime/configure';
import { removeFromRegistry } from './runtime/unregister';

export class PluginRegistry extends PluginRegistryLifecycle {
  configureV2(options: ConfigureV2Options): void {
    this._eventBus = options.eventBus;
    this._v2Config = buildV2Config(options, this._v2Config.logFn);
  }

  register(
    plugin: IPlugin,
    options: { builtIn?: boolean; sourceExtension?: string; deferReadinessReplay?: boolean } = {},
  ): void {
    if (this._plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID '${plugin.id}' is already registered`);
    }
    const info = validateAndCreatePluginInfo(plugin, options, this._v2Config);
    addToRegistry(info, this._plugins, this._extensionMap, this._eventBus);
    if (!options.deferReadinessReplay) {
      this._replayReadinessForPlugin(info);
    }
  }

  unregister(pluginId: string): boolean {
    return removeFromRegistry(pluginId, this._plugins, this._extensionMap, this._initializedPlugins, this._eventBus);
  }
}
