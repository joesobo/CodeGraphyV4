import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { LoadedCodeGraphyWorkspacePluginPackage } from '../plugins/packageRuntime';
import type { CorePluginRegistry } from '../plugins/registry';
import { persistCodeGraphyWorkspaceIndexMetadata } from '../workspace/meta';
import {
  createCodeGraphyWorkspacePackageAwarePluginSignature,
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
  settings: CodeGraphyWorkspaceSettings;
  includeMissingConfiguredPlugins?: boolean;
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
  const representedPluginIds = new Set([
    ...runtimePlugins.map(plugin => plugin.id),
    ...input.loadedPackagePlugins.flatMap(loadedPlugin => [
      loadedPlugin.record.package,
      loadedPlugin.record.id,
    ].filter((value): value is string => Boolean(value))),
  ]);
  const missingPackagePlugins = input.includeMissingConfiguredPlugins === false
    ? []
    : input.settings.plugins
      .filter(plugin => plugin.activation === 'enabled' && !representedPluginIds.has(plugin.id))
      .map(plugin => plugin.id);
  return createCodeGraphyWorkspacePackageAwarePluginSignature({
    runtimePlugins,
    packagePlugins: input.loadedPackagePlugins.map(loadedPlugin => loadedPlugin.record),
    missingPackagePlugins,
  }) ?? createCodeGraphyWorkspacePluginSignature(
    input.registry.list().map(info => info.plugin),
  );
}

export function persistWorkspaceIndexMetadata(input: {
  pluginSignature: string | null;
  failedPluginIds: ReadonlySet<string>;
  settings: CodeGraphyWorkspaceSettings;
  settingsPluginIds: ReadonlySet<string>;
  workspaceRoot: string;
}): void {
  persistCodeGraphyWorkspaceIndexMetadata(input.workspaceRoot, {
    pluginSignature: input.pluginSignature,
    failedPluginIds: [...input.failedPluginIds].sort((left, right) => left.localeCompare(right)),
    settingsSignature: createCodeGraphyWorkspaceSettingsSignature(
      input.settings,
      input.settingsPluginIds,
    ),
  });
}
