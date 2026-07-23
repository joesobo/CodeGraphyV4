import { PluginRegistry } from '../../../core/plugins/registry/manager';
import { ExtensionPluginRegistry } from '../../plugins/registry';

/**
 * Owns the plugin registries used by the VS Code Extension host.
 *
 * Core plugins remain in the Core registry. Extension plugins remain in the
 * Extension registry. This class composes both registries at the host boundary.
 */
export class WorkspacePluginRegistry extends PluginRegistry {
  readonly extensionPlugins = new ExtensionPluginRegistry();

  notifyWebviewReady(): void {
    this.extensionPlugins.notifyWebviewReady();
  }

  override disposeAll(): void {
    super.disposeAll();
    this.extensionPlugins.disposeAll();
  }
}
