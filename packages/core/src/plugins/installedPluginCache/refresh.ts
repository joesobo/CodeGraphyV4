import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import type {
  CodeGraphyInstalledPluginRecord,
  RefreshCodeGraphyInstalledPluginsOptions,
} from './contracts';
import { readPackageManifest } from './packageReader';
import {
  readCodeGraphyInstalledPluginCache,
  writeCodeGraphyInstalledPluginCache,
} from './storage';

async function findCodeGraphyPluginPackages(globalPackageRoot: string): Promise<CodeGraphyInstalledPluginRecord[]> {
  const scopeRoot = path.join(globalPackageRoot, '@codegraphy-dev');
  let packageNames: string[];
  try {
    packageNames = await fsPromises.readdir(scopeRoot);
  } catch {
    return [];
  }

  const records = await Promise.all(
    packageNames.map(packageName => readPackageManifest(path.join(scopeRoot, packageName))),
  );
  return records.filter((entry): entry is CodeGraphyInstalledPluginRecord => entry !== null);
}

export async function refreshCodeGraphyInstalledPlugins(
  options: RefreshCodeGraphyInstalledPluginsOptions,
): Promise<{ version: 1; plugins: CodeGraphyInstalledPluginRecord[] }> {
  const existingCache = readCodeGraphyInstalledPluginCache({ homeDir: options.homeDir });
  const records = (await Promise.all(
    options.globalPackageRoots.map(findCodeGraphyPluginPackages),
  )).flat();
  const recordByPackage = new Map<string, CodeGraphyInstalledPluginRecord>();

  for (const record of existingCache.plugins) {
    if (!record.package.startsWith('@codegraphy-dev/')) {
      recordByPackage.set(record.package, record);
    }
  }

  for (const record of records) {
    recordByPackage.set(record.package, record);
  }

  return writeCodeGraphyInstalledPluginCache(
    {
      version: 1,
      plugins: [...recordByPackage.values()]
        .sort((left, right) => left.package.localeCompare(right.package)),
    },
    { homeDir: options.homeDir },
  );
}
