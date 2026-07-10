import { linkCodeGraphyInstalledPluginPackage } from '@codegraphy-dev/core';

export interface WriteLinkedPluginCacheOptions {
  homePath: string;
  packageRoot: string;
}

export async function writeLinkedPluginCache(
  options: WriteLinkedPluginCacheOptions,
): Promise<void> {
  await linkCodeGraphyInstalledPluginPackage({
    homeDir: options.homePath,
    packageRoot: options.packageRoot,
  });
}
