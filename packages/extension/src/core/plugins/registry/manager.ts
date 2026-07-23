/**
 * @fileoverview Plugin registry for managing CodeGraphy plugins.
 * @module core/plugins/registry/manager
 */

import type {
  IPlugin,
} from '../types/contracts';
import { buildV2Config } from './runtime/registration/configure';
import { PluginRegistryLifecycle } from './runtime/state/lifecycle';
import { validateAndCreatePluginInfo, addToRegistry } from './runtime/registration/register';
import type { ConfigureV2Options } from './runtime/registration/configure';
import { removeFromRegistry, unloadPlugin } from './runtime/registration/unregister';

export class PluginRegistry extends PluginRegistryLifecycle {
  configureV2(options: ConfigureV2Options): void {
    this._eventBus = options.eventBus;
    this._v2Config = buildV2Config(options, this._v2Config.logFn);
  }

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
      deferReadinessReplay?: boolean;
    } = {},
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
    const info = this._plugins.get(pluginId);
    if (!info) return false;
    const initialization = this._initializingPlugins.get(info);
    const removed = removeFromRegistry(
      pluginId,
      this._plugins,
      this._extensionMap,
      this._initializedPlugins,
      this._eventBus,
    );
    if (removed) {
      this._queuePluginUnload(() => unloadPlugin(info), initialization);
    }
    return removed;
  }

}
