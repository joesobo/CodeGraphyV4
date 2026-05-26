import type {
  CodeGraphyInstalledPluginCache,
  CodeGraphyInstalledPluginRecord,
  RegisterCodeGraphyInstalledPluginOptions,
} from './contracts';
import { readRequiredPackageManifest } from './packageReader';
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
  recordByPackage.set(record.package, record);

  return {
    version: 1,
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
