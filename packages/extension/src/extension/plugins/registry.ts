import type { IExtensionPlugin } from '@codegraphy-dev/extension-plugin-api';
import { satisfiesSemverRange } from '../../core/plugins/versioning/apiVersions';

export const EXTENSION_PLUGIN_API_VERSION = '1.0.0';

export interface ExtensionPluginInfo {
  plugin: IExtensionPlugin;
  builtIn: boolean;
  sourcePackage?: string;
  sourcePackageRoot?: string;
  descriptorSignature?: string;
}

export interface RegisterExtensionPluginOptions {
  builtIn?: boolean;
  sourcePackage?: string;
  sourcePackageRoot?: string;
  descriptorSignature?: string;
}

function assertExtensionApiCompatibility(
  subject: string,
  pluginId: string,
  apiVersion: string,
): void {
  if (!satisfiesSemverRange(EXTENSION_PLUGIN_API_VERSION, apiVersion)) {
    throw new Error(
      `${subject} '${pluginId}' requires API '${apiVersion}', `
      + `but the VS Code extension provides '${EXTENSION_PLUGIN_API_VERSION}'.`,
    );
  }
}

export function assertExtensionPluginDescriptorApiCompatibility(
  pluginId: string,
  apiVersion: string,
): void {
  assertExtensionApiCompatibility('Extension plugin descriptor', pluginId, apiVersion);
}

export class ExtensionPluginRegistry {
  private readonly plugins = new Map<string, ExtensionPluginInfo>();
  private readonly initializedPlugins = new Set<string>();

  register(plugin: IExtensionPlugin, options: RegisterExtensionPluginOptions = {}): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Extension plugin '${plugin.id}' is already registered.`);
    }
    assertExtensionApiCompatibility('Extension plugin', plugin.id, plugin.apiVersion);

    this.plugins.set(plugin.id, {
      plugin,
      builtIn: Boolean(options.builtIn),
      ...(options.sourcePackage ? { sourcePackage: options.sourcePackage } : {}),
      ...(options.sourcePackageRoot ? { sourcePackageRoot: options.sourcePackageRoot } : {}),
      ...(options.descriptorSignature ? { descriptorSignature: options.descriptorSignature } : {}),
    });
  }

  get(pluginId: string): ExtensionPluginInfo | undefined {
    return this.plugins.get(pluginId);
  }

  list(): ExtensionPluginInfo[] {
    return [...this.plugins.values()];
  }

  listActive(): ExtensionPluginInfo[] {
    return this.list().filter(info => this.initializedPlugins.has(info.plugin.id));
  }

  async initializeAll(workspaceRoot: string): Promise<void> {
    for (const info of this.plugins.values()) {
      if (this.initializedPlugins.has(info.plugin.id)) continue;
      try {
        await info.plugin.initialize?.(workspaceRoot);
        this.initializedPlugins.add(info.plugin.id);
      } catch (error) {
        console.error(
          `[CodeGraphy] Error initializing Extension plugin ${info.plugin.id}:`,
          error,
        );
      }
    }
  }

  notifyWebviewReady(): void {
    for (const info of this.listActive()) {
      try {
        info.plugin.onWebviewReady?.();
      } catch (error) {
        console.error(
          `[CodeGraphy] Error notifying Extension plugin ${info.plugin.id} that the webview is ready:`,
          error,
        );
      }
    }
  }

  unregister(pluginId: string): boolean {
    const info = this.plugins.get(pluginId);
    if (!info) return false;

    try {
      info.plugin.onUnload?.();
    } catch (error) {
      console.error(`[CodeGraphy] Error unloading Extension plugin ${pluginId}:`, error);
    }
    this.initializedPlugins.delete(pluginId);
    return this.plugins.delete(pluginId);
  }

  disposeAll(): void {
    for (const pluginId of [...this.plugins.keys()]) {
      this.unregister(pluginId);
    }
  }
}
