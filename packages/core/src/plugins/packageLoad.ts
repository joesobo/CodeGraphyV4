import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import { createPluginFromModule } from './packageModule';
import { createPackagePluginFactoryInvocation } from './packageOptions';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
} from './packageRuntimeContracts';
import type { CodeGraphyWorkspacePluginSettings } from '../workspace/settings';
import { assertPluginDescriptorApiCompatibility } from './compatibility';

function getStaticPluginId(record: CodeGraphyInstalledPluginRecord): string {
  return record.id;
}

function createPluginModuleUrl(record: CodeGraphyInstalledPluginRecord): string {
  const modulePath = path.resolve(record.packageRoot, record.entry);
  const moduleUrl = pathToFileURL(modulePath);
  moduleUrl.searchParams.set('codegraphyPluginId', record.id);
  moduleUrl.searchParams.set('codegraphyPluginApiVersion', record.apiVersion);
  moduleUrl.searchParams.set('codegraphyPackageVersion', record.version);
  return moduleUrl.href;
}

function validateRuntimePluginId(
  pluginId: string,
  record: CodeGraphyInstalledPluginRecord,
): void {
  const staticPluginId = getStaticPluginId(record);
  if (pluginId !== staticPluginId) {
    throw new Error(
      `Package '${record.package}' exported plugin id '${pluginId}', but its package manifest declares '${staticPluginId}'.`,
    );
  }
}

export async function loadCodeGraphyWorkspacePluginPackage(
  settings: CodeGraphyWorkspacePluginSettings,
  record: CodeGraphyInstalledPluginRecord,
  workspaceRoot?: string,
): Promise<LoadedCodeGraphyWorkspacePluginPackage> {
  assertPluginDescriptorApiCompatibility(record.id, record.apiVersion);
  const moduleNamespace: unknown = await import(createPluginModuleUrl(record));
  const { invocation, options } = createPackagePluginFactoryInvocation(record, settings, workspaceRoot);
  const plugin = await createPluginFromModule(moduleNamespace, record.package, invocation);
  validateRuntimePluginId(plugin.id, record);

  return {
    plugin,
    packageName: record.package,
    record,
    ...(options ? { options } : {}),
  };
}
