import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { LoadedCodeGraphyWorkspacePluginPackage } from '../plugins/packageRuntime';
import type { CorePluginRegistry } from '../plugins/registry';
import { persistCodeGraphyWorkspaceIndexMetadata } from '../workspace/meta';
import {
  createCodeGraphyWorkspacePackageAwarePluginSignature,
  createCodeGraphyWorkspacePluginBuildSignature,
  createCodeGraphyWorkspacePluginSignature,
  createCodeGraphyWorkspaceSettingsSignature,
} from '../workspace/signatures';
import type { CodeGraphyWorkspaceSettings } from '../workspace/settings';
import type { IndexCodeGraphyWorkspacePlugin } from './contracts';

function runtimeSignaturePlugins(registry: CorePluginRegistry): IPlugin[] {
  return registry
    .list()
    .filter(info => info.builtIn || !info.sourcePackage)
    .map(info => info.plugin);
}

export function createWorkspaceIndexPluginSignature(input: {
  explicitPlugins?: readonly IndexCodeGraphyWorkspacePlugin[];
  loadedPackagePlugins: LoadedCodeGraphyWorkspacePluginPackage[];
  registry: CorePluginRegistry;
}): string | null {
  const explicitRuntimePlugins = (input.explicitPlugins ?? []).map(plugin => (
    'plugin' in plugin ? plugin.plugin : plugin
  ));
  const runtimePluginsById = new Map(
    runtimeSignaturePlugins(input.registry).map(plugin => [plugin.id, plugin]),
  );
  for (const plugin of explicitRuntimePlugins) {
    runtimePluginsById.set(plugin.id, plugin);
  }
  const runtimePlugins = [...runtimePluginsById.values()];
  return createCodeGraphyWorkspacePackageAwarePluginSignature({
    runtimePlugins,
    packagePlugins: input.loadedPackagePlugins.map(loadedPlugin => loadedPlugin.record),
  }) ?? createCodeGraphyWorkspacePluginSignature(
    input.registry.list().map(info => info.plugin),
  );
}

export function createWorkspaceIndexPluginBuildSignature(
  loadedPackagePlugins: readonly LoadedCodeGraphyWorkspacePluginPackage[],
): string | null {
  return createCodeGraphyWorkspacePluginBuildSignature(
    loadedPackagePlugins.map(loadedPlugin => ({
      id: loadedPlugin.plugin.id,
      signature: JSON.stringify({
        buildIdentity: loadedPlugin.buildIdentity,
        descriptor: {
          apiVersion: loadedPlugin.record.apiVersion,
          entry: loadedPlugin.record.entry,
          host: loadedPlugin.record.host,
          id: loadedPlugin.record.id,
        },
        package: {
          name: loadedPlugin.record.package,
          version: loadedPlugin.record.version,
        },
        runtime: {
          apiVersion: loadedPlugin.plugin.apiVersion,
          id: loadedPlugin.plugin.id,
          version: loadedPlugin.plugin.version,
        },
      }),
    })),
  );
}

export function persistWorkspaceIndexMetadata(input: {
  pluginSignature: string | null;
  pluginBuildSignature: string | null;
  failedPluginIds: ReadonlySet<string>;
  settings: CodeGraphyWorkspaceSettings;
  settingsPluginIds: ReadonlySet<string>;
  workspaceRoot: string;
}): void {
  persistCodeGraphyWorkspaceIndexMetadata(input.workspaceRoot, {
    pluginSignature: input.pluginSignature,
    pluginBuildSignature: input.pluginBuildSignature,
    failedPluginIds: [...input.failedPluginIds].sort((left, right) => left.localeCompare(right)),
    settingsSignature: createCodeGraphyWorkspaceSettingsSignature(
      input.settings,
      input.settingsPluginIds,
    ),
  });
}
