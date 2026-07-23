import * as path from 'node:path';
import type {
  CodeGraphyInstalledPluginCache,
  CodeGraphyInstalledPluginRecord,
  LinkCodeGraphyInstalledPluginPackageOptions,
  RegisterCodeGraphyInstalledPluginOptions,
} from './contracts';
import { readPackageManifest, readRequiredPackageManifest } from './packageReader';
import { getGlobalPackageRootPackagePath } from './paths';
import {
  readCodeGraphyInstalledPluginCache,
  writeCodeGraphyInstalledPluginCache,
} from './storage';

function replaceInstalledPackageRecords(
  cache: CodeGraphyInstalledPluginCache,
  records: readonly CodeGraphyInstalledPluginRecord[],
): CodeGraphyInstalledPluginCache {
  const packageName = records[0]?.package;
  const activationById = new Map(
    cache.plugins
      .filter(plugin => plugin.package === packageName)
      .map(plugin => [plugin.id, plugin.globallyEnabled]),
  );
  const retained = packageName
    ? cache.plugins.filter(plugin => plugin.package !== packageName)
    : cache.plugins;
  return {
    version: 3,
    plugins: [
      ...retained,
      ...records.map(record => ({
        ...record,
        globallyEnabled: activationById.get(record.id) ?? false,
      })),
    ].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function storeRecords(
  records: readonly CodeGraphyInstalledPluginRecord[],
  homeDir: string | undefined,
): void {
  writeCodeGraphyInstalledPluginCache(
    replaceInstalledPackageRecords(readCodeGraphyInstalledPluginCache({ homeDir }), records),
    { homeDir },
  );
}

export async function registerCodeGraphyInstalledPlugin(
  options: RegisterCodeGraphyInstalledPluginOptions,
): Promise<CodeGraphyInstalledPluginRecord[]> {
  let lastError: Error | undefined;
  for (const globalPackageRoot of options.globalPackageRoots) {
    const packageRoot = getGlobalPackageRootPackagePath(globalPackageRoot, options.packageName);
    try {
      const records = await readRequiredPackageManifest(options.packageName, packageRoot);
      storeRecords(records, options.homeDir);
      return records;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error(
    `CodeGraphy plugin package '${options.packageName}' was not found in global npm package roots. `
    + `Run \`npm i -g ${options.packageName}\` first.`,
  );
}

export async function linkCodeGraphyInstalledPluginPackage(
  options: LinkCodeGraphyInstalledPluginPackageOptions,
): Promise<CodeGraphyInstalledPluginRecord[]> {
  const packageRoot = path.resolve(options.packageRoot);
  const records = await readPackageManifest(packageRoot);
  if (!records) {
    throw new Error(`Package at '${packageRoot}' is not a CodeGraphy plugin.`);
  }
  storeRecords(records, options.homeDir);
  return records;
}
