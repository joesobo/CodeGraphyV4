import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import { createPluginFromModule } from './packageModule';
import { createPackagePluginFactoryInvocation } from './packageOptions';
import type {
  LoadedCodeGraphyPluginPackageModule,
  LoadedCodeGraphyWorkspacePluginPackage,
  PreparedCodeGraphyPluginPackageModule,
  PreparedCodeGraphyWorkspacePluginPackage,
} from './packageRuntimeContracts';
import type { CodeGraphyWorkspacePluginSettings } from '../workspace/settings';
import {
  assertPluginApiCompatibility,
  assertPluginDescriptorApiCompatibility,
} from './compatibility';
import { prepareCodeGraphyPackageBuildSnapshot } from './packageBuildSnapshot';

function getStaticPluginId(record: CodeGraphyInstalledPluginRecord): string {
  return record.id;
}

export async function importCodeGraphyPluginPackageModule(
  record: CodeGraphyInstalledPluginRecord,
): Promise<LoadedCodeGraphyPluginPackageModule> {
  return (await prepareCodeGraphyPluginPackageModule(record)).load();
}

export async function prepareCodeGraphyPluginPackageModule(
  record: CodeGraphyInstalledPluginRecord,
): Promise<PreparedCodeGraphyPluginPackageModule> {
  const packageRoot = path.resolve(record.packageRoot);
  const { buildIdentity, snapshotPackageRoot } = await prepareCodeGraphyPackageBuildSnapshot(
    packageRoot,
  );
  return {
    buildIdentity,
    packageSnapshotRoot: snapshotPackageRoot,
    async load(): Promise<LoadedCodeGraphyPluginPackageModule> {
      const modulePath = path.resolve(snapshotPackageRoot, record.entry);
      const moduleUrl = pathToFileURL(modulePath);
      moduleUrl.searchParams.set('codegraphyPluginId', record.id);
      moduleUrl.searchParams.set('codegraphyPluginApiVersion', record.apiVersion);
      moduleUrl.searchParams.set('codegraphyPackageVersion', record.version);
      return {
        buildIdentity,
        moduleNamespace: await import(moduleUrl.href),
        packageSnapshotRoot: snapshotPackageRoot,
      };
    },
  };
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
  return (await prepareCodeGraphyWorkspacePluginPackage(settings, record, workspaceRoot)).load();
}

export async function prepareCodeGraphyWorkspacePluginPackage(
  settings: CodeGraphyWorkspacePluginSettings,
  record: CodeGraphyInstalledPluginRecord,
  workspaceRoot?: string,
): Promise<PreparedCodeGraphyWorkspacePluginPackage> {
  assertPluginDescriptorApiCompatibility(record.id, record.apiVersion);
  const preparedModule = await prepareCodeGraphyPluginPackageModule(record);
  const { invocation, options } = createPackagePluginFactoryInvocation(record, settings, workspaceRoot);

  return {
    buildIdentity: preparedModule.buildIdentity,
    packageSnapshotRoot: preparedModule.packageSnapshotRoot,
    packageName: record.package,
    record,
    ...(options ? { options } : {}),
    async load(): Promise<LoadedCodeGraphyWorkspacePluginPackage> {
      const { moduleNamespace } = await preparedModule.load();
      const plugin = await createPluginFromModule(moduleNamespace, record.package, invocation);
      try {
        validateRuntimePluginId(plugin.id, record);
        assertPluginApiCompatibility(plugin);
      } catch (error) {
        try {
          plugin.onUnload?.();
        } catch (unloadError) {
          console.error(
            `[CodeGraphy] Error unloading rejected plugin ${plugin.id}:`,
            unloadError,
          );
        }
        throw error;
      }
      return {
        buildIdentity: preparedModule.buildIdentity,
        packageSnapshotRoot: preparedModule.packageSnapshotRoot,
        plugin,
        packageName: record.package,
        record,
        ...(options ? { options } : {}),
      };
    },
  };
}
