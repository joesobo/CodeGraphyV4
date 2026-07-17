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

function runtimeSignaturePlugins(registry: CorePluginRegistry): IPlugin[] {
  return registry
    .list()
    .filter(info => info.builtIn || !info.sourcePackage)
    .map(info => info.plugin);
}

export function createWorkspaceIndexPluginSignature(input: {
  loadedPackagePlugins: LoadedCodeGraphyWorkspacePluginPackage[];
  registry: CorePluginRegistry;
}): string | null {
  return createCodeGraphyWorkspacePackageAwarePluginSignature({
    runtimePlugins: runtimeSignaturePlugins(input.registry),
    packagePlugins: input.loadedPackagePlugins.map(loadedPlugin => loadedPlugin.record),
  }) ?? createCodeGraphyWorkspacePluginSignature(
    input.registry.list().map(info => info.plugin),
  );
}

export function persistWorkspaceIndexMetadata(input: {
  loadedPackagePlugins: LoadedCodeGraphyWorkspacePluginPackage[];
  registry: CorePluginRegistry;
  settings: CodeGraphyWorkspaceSettings;
  workspaceRoot: string;
}): void {
  persistCodeGraphyWorkspaceIndexMetadata(input.workspaceRoot, {
    pluginSignature: createWorkspaceIndexPluginSignature(input),
    settingsSignature: createCodeGraphyWorkspaceSettingsSignature(input.settings),
  });
}
