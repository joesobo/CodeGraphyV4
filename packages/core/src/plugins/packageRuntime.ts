import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { IPlugin } from '@codegraphy/plugin-api';
import {
  type CodeGraphyInstalledPluginRecord,
  readCodeGraphyInstalledPluginCache,
} from './installedCache';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  type CodeGraphyWorkspacePluginSettings,
  type CodeGraphyWorkspaceSettings,
} from '../workspace/settings';

interface PackageJsonWithEntrypoint {
  exports?: unknown;
  main?: unknown;
}

type UnknownPluginFactory = () => unknown;

export interface LoadedCodeGraphyWorkspacePluginPackage {
  plugin: IPlugin;
  packageName: string;
  record: CodeGraphyInstalledPluginRecord;
  options?: Record<string, unknown>;
}

export interface LoadCodeGraphyWorkspacePluginPackagesOptions {
  settings: CodeGraphyWorkspaceSettings;
  homeDir?: string;
  warn?: (message: string) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPluginFactory(value: unknown): value is UnknownPluginFactory {
  return typeof value === 'function';
}

function mergePluginOptions(
  record: CodeGraphyInstalledPluginRecord,
  settings: CodeGraphyWorkspacePluginSettings,
): Record<string, unknown> | undefined {
  const merged = {
    ...record.defaultOptions,
    ...settings.options,
  };

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function getEntrypointFromExports(exportsValue: unknown): string | undefined {
  if (typeof exportsValue === 'string') {
    return exportsValue;
  }

  if (!isRecord(exportsValue)) {
    return undefined;
  }

  const rootExport = exportsValue['.'] ?? exportsValue;
  if (typeof rootExport === 'string') {
    return rootExport;
  }

  if (!isRecord(rootExport)) {
    return undefined;
  }

  for (const condition of ['default', 'import', 'node', 'require']) {
    const conditionTarget = rootExport[condition];
    if (typeof conditionTarget === 'string') {
      return conditionTarget;
    }
  }

  return undefined;
}

function resolvePackageEntrypoint(
  packageRoot: string,
  packageJson: PackageJsonWithEntrypoint,
): string {
  const entrypoint = getEntrypointFromExports(packageJson.exports)
    ?? (typeof packageJson.main === 'string' ? packageJson.main : undefined);

  if (!entrypoint) {
    throw new Error('CodeGraphy plugin package must define package.json exports or main.');
  }

  return path.resolve(packageRoot, entrypoint);
}

async function createPluginFromModule(moduleNamespace: unknown, packageName: string): Promise<IPlugin> {
  if (!isRecord(moduleNamespace)) {
    throw new Error(`CodeGraphy plugin package '${packageName}' did not export a module object.`);
  }

  const exportedPlugin: unknown = moduleNamespace.default ?? moduleNamespace.createPlugin ?? moduleNamespace.plugin;
  const plugin: unknown = isPluginFactory(exportedPlugin)
    ? await exportedPlugin()
    : exportedPlugin;

  if (!isRecord(plugin) || typeof plugin.id !== 'string') {
    throw new Error(`CodeGraphy plugin package '${packageName}' did not export a plugin factory or plugin object.`);
  }

  return plugin as unknown as IPlugin;
}

async function loadCodeGraphyWorkspacePluginPackage(
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

function shouldLoadPackagePlugin(settings: CodeGraphyWorkspacePluginSettings): boolean {
  return settings.package !== CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME;
}

export async function loadCodeGraphyWorkspacePluginPackages(
  options: LoadCodeGraphyWorkspacePluginPackagesOptions,
): Promise<LoadedCodeGraphyWorkspacePluginPackage[]> {
  const warn = options.warn ?? (() => undefined);
  const recordsByPackage = new Map(
    readCodeGraphyInstalledPluginCache({ homeDir: options.homeDir })
      .plugins
      .map(record => [record.package, record] as const),
  );
  const loaded: LoadedCodeGraphyWorkspacePluginPackage[] = [];

  for (const pluginSettings of options.settings.plugins.filter(shouldLoadPackagePlugin)) {
    const record = recordsByPackage.get(pluginSettings.package);
    if (!record) {
      warn(`CodeGraphy plugin package '${pluginSettings.package}' is enabled but not installed.`);
      continue;
    }

    try {
      loaded.push(await loadCodeGraphyWorkspacePluginPackage(pluginSettings, record));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin package '${pluginSettings.package}' could not be loaded: ${message}`);
    }
  }

  return loaded;
}
