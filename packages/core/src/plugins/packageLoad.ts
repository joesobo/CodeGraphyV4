import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import { createPluginFromModule } from './packageModule';
import { createPackagePluginFactoryInvocation } from './packageOptions';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
} from './packageRuntimeContracts';
import type { CodeGraphyWorkspacePluginSettings } from '../workspace/settings';

function getStaticPluginId(record: CodeGraphyInstalledPluginRecord): string {
  return record.id;
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
  const modulePath = path.resolve(record.packageRoot, record.entry);
  const moduleNamespace: unknown = await import(pathToFileURL(modulePath).href);
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
