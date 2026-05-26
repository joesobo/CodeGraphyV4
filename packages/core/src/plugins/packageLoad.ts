import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import { createPluginFromModule } from './packageModule';
import { mergePluginOptions } from './packageOptions';
import { resolvePackageEntrypoint } from './packageEntrypoint';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
  PackageJsonWithEntrypoint,
} from './packageRuntimeContracts';
import type { CodeGraphyWorkspacePluginSettings } from '../workspace/settings';

export async function loadCodeGraphyWorkspacePluginPackage(
  settings: CodeGraphyWorkspacePluginSettings,
  record: CodeGraphyInstalledPluginRecord,
): Promise<LoadedCodeGraphyWorkspacePluginPackage> {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(record.packageRoot, 'package.json'), 'utf-8'),
  ) as PackageJsonWithEntrypoint;
  const modulePath = resolvePackageEntrypoint(record.packageRoot, packageJson);
  const moduleNamespace: unknown = await import(pathToFileURL(modulePath).href);
  const plugin = await createPluginFromModule(moduleNamespace, record.package);
  const options = mergePluginOptions(record, settings);

  return {
    plugin,
    packageName: record.package,
    record,
    ...(options ? { options } : {}),
  };
}
