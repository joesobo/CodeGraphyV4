import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import { createPluginFromModule } from './packageModule';
import { createPackagePluginFactoryInvocation } from './packageOptions';
import type {
  LoadedCodeGraphyPluginPackageModule,
  LoadedCodeGraphyWorkspacePluginPackage,
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
  const packageRoot = path.resolve(record.packageRoot);
  const { buildIdentity, snapshotPackageRoot } = await prepareCodeGraphyPackageBuildSnapshot(
    packageRoot,
  );
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
  const {
    buildIdentity,
    moduleNamespace,
    packageSnapshotRoot,
  } = await importCodeGraphyPluginPackageModule(record);
  const { invocation, options } = createPackagePluginFactoryInvocation(record, settings, workspaceRoot);

  return {
    buildIdentity,
    packageSnapshotRoot,
    packageName: record.package,
    record,
    ...(options ? { options } : {}),
    async load(): Promise<LoadedCodeGraphyWorkspacePluginPackage> {
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
        buildIdentity,
        packageSnapshotRoot,
        plugin,
        packageName: record.package,
        record,
        ...(options ? { options } : {}),
      };
    },
  };
}
