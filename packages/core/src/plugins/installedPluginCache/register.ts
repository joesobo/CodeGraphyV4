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

function upsertInstalledPluginRecord(
  cache: CodeGraphyInstalledPluginCache,
  record: CodeGraphyInstalledPluginRecord,
): CodeGraphyInstalledPluginCache {
  const recordByPackage = new Map(
    cache.plugins.map(plugin => [plugin.package, plugin] as const),
  );
  const current = recordByPackage.get(record.package);
  recordByPackage.set(record.package, {
    ...record,
    globallyEnabled: current?.globallyEnabled ?? false,
  });

  return {
    version: 2,
    plugins: [...recordByPackage.values()]
      .sort((left, right) => left.package.localeCompare(right.package)),
  };
}

export async function registerCodeGraphyInstalledPlugin(
  options: RegisterCodeGraphyInstalledPluginOptions,
): Promise<CodeGraphyInstalledPluginRecord> {
  let lastError: Error | undefined;

  for (const globalPackageRoot of options.globalPackageRoots) {
    const packageRoot = getGlobalPackageRootPackagePath(globalPackageRoot, options.packageName);
    try {
      const record = await readRequiredPackageManifest(options.packageName, packageRoot);
      writeCodeGraphyInstalledPluginCache(
        upsertInstalledPluginRecord(readCodeGraphyInstalledPluginCache({ homeDir: options.homeDir }), record),
        { homeDir: options.homeDir },
      );
      return record;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error(
    `CodeGraphy plugin package '${options.packageName}' was not found in global npm package roots. ` +
    `Run \`npm i -g ${options.packageName}\` first.`,
  );
}

export async function linkCodeGraphyInstalledPluginPackage(
  options: LinkCodeGraphyInstalledPluginPackageOptions,
): Promise<CodeGraphyInstalledPluginRecord> {
  const record = await readPackageManifest(options.packageRoot);
  if (!record) {
    throw new Error(`Package at '${options.packageRoot}' is not a CodeGraphy plugin.`);
  }

  writeCodeGraphyInstalledPluginCache(
    upsertInstalledPluginRecord(readCodeGraphyInstalledPluginCache({ homeDir: options.homeDir }), record),
    { homeDir: options.homeDir },
  );
  return record;
}
