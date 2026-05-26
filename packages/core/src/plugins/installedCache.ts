import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createMarkdownPlugin } from '@codegraphy-dev/plugin-markdown';
import {
  parseCodeGraphyPluginPackageManifest,
  type CodeGraphyPluginDisclosure,
  type CodeGraphyPluginPackageManifest,
} from './packageManifest';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../workspace/settings';

export interface CodeGraphyInstalledPluginRecord extends CodeGraphyPluginPackageManifest {
  packageRoot: string;
}

export interface CodeGraphyInstalledPluginCache {
  version: 1;
  plugins: CodeGraphyInstalledPluginRecord[];
}

export interface CodeGraphyUserStateOptions {
  homeDir?: string;
}

export interface RefreshCodeGraphyInstalledPluginsOptions extends CodeGraphyUserStateOptions {
  globalPackageRoots: string[];
}

export interface RegisterCodeGraphyInstalledPluginOptions extends CodeGraphyUserStateOptions {
  packageName: string;
  globalPackageRoots: string[];
}

export function getCodeGraphyUserDirectoryPath(homeDir: string = os.homedir()): string {
  return path.join(homeDir, '.codegraphy');
}

export function getInstalledPluginsCachePath(homeDir: string = os.homedir()): string {
  return path.join(getCodeGraphyUserDirectoryPath(homeDir), 'plugins.json');
}

export function getCodeGraphyUserSettingsPath(homeDir: string = os.homedir()): string {
  return path.join(getCodeGraphyUserDirectoryPath(homeDir), 'settings.json');
}

function createEmptyInstalledPluginCache(): CodeGraphyInstalledPluginCache {
  return {
    version: 1,
    plugins: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDisclosures(value: unknown): CodeGraphyPluginDisclosure[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is CodeGraphyPluginDisclosure =>
      entry === 'network'
      || entry === 'secrets'
      || entry === 'externalProcesses'
      || entry === 'workspaceWrites'
      || entry === 'outsideWorkspaceWrites'
      || entry === 'extraFileReads',
    )
    : [];
}

function normalizeInstalledPluginRecord(value: unknown): CodeGraphyInstalledPluginRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const packageName = typeof value.package === 'string' ? value.package : '';
  const version = typeof value.version === 'string' ? value.version : '';
  const apiVersion = typeof value.apiVersion === 'string' ? value.apiVersion : '';
  const packageRoot = typeof value.packageRoot === 'string' ? value.packageRoot : '';
  if (
    packageName.length === 0
    || version.length === 0
    || apiVersion.length === 0
    || packageRoot.length === 0
  ) {
    return null;
  }

  const record: CodeGraphyInstalledPluginRecord = {
    package: packageName,
    version,
    apiVersion,
    disclosures: normalizeDisclosures(value.disclosures),
    packageRoot,
  };

  if (isRecord(value.defaultOptions)) {
    record.defaultOptions = { ...value.defaultOptions };
  }

  return record;
}

function normalizeInstalledPluginCache(value: unknown): CodeGraphyInstalledPluginCache {
  if (!isRecord(value) || !Array.isArray(value.plugins)) {
    return createEmptyInstalledPluginCache();
  }

  return {
    version: 1,
    plugins: value.plugins
      .map(normalizeInstalledPluginRecord)
      .filter((entry): entry is CodeGraphyInstalledPluginRecord => entry !== null),
  };
}

export function readCodeGraphyInstalledPluginCache(
  options: CodeGraphyUserStateOptions = {},
): CodeGraphyInstalledPluginCache {
  try {
    return normalizeInstalledPluginCache(
      JSON.parse(fs.readFileSync(getInstalledPluginsCachePath(options.homeDir), 'utf-8')),
    );
  } catch {
    return createEmptyInstalledPluginCache();
  }
}

export function writeCodeGraphyInstalledPluginCache(
  cache: CodeGraphyInstalledPluginCache,
  options: CodeGraphyUserStateOptions = {},
): CodeGraphyInstalledPluginCache {
  const normalized = normalizeInstalledPluginCache(cache);
  const cachePath = getInstalledPluginsCachePath(options.homeDir);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

export function createBundledMarkdownInstalledPluginRecord(): CodeGraphyInstalledPluginRecord {
  const plugin = createMarkdownPlugin();
  return {
    package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    version: plugin.version,
    apiVersion: plugin.apiVersion,
    disclosures: [],
    packageRoot: '',
  };
}

async function readPackageManifest(packageRoot: string): Promise<CodeGraphyInstalledPluginRecord | null> {
  try {
    const packageJson = JSON.parse(
      await fsPromises.readFile(path.join(packageRoot, 'package.json'), 'utf-8'),
    ) as unknown;
    const manifest = parseCodeGraphyPluginPackageManifest(packageJson);
    return manifest ? { ...manifest, packageRoot } : null;
  } catch {
    return null;
  }
}

async function readRequiredPackageManifest(
  packageName: string,
  packageRoot: string,
): Promise<CodeGraphyInstalledPluginRecord> {
  let packageJson: unknown;
  try {
    packageJson = JSON.parse(
      await fsPromises.readFile(path.join(packageRoot, 'package.json'), 'utf-8'),
    ) as unknown;
  } catch {
    throw new Error(
      `CodeGraphy plugin package '${packageName}' was not found in global npm package roots. ` +
      `Run \`npm i -g ${packageName}\` first.`,
    );
  }

  const manifest = parseCodeGraphyPluginPackageManifest(packageJson);
  if (!manifest) {
    throw new Error(`Package '${packageName}' is not a CodeGraphy plugin.`);
  }

  if (manifest.package !== packageName) {
    throw new Error(
      `Package '${packageName}' resolved to CodeGraphy plugin '${manifest.package}'.`,
    );
  }

  return { ...manifest, packageRoot };
}

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

function getGlobalPackageRootPackagePath(globalPackageRoot: string, packageName: string): string {
  return path.join(globalPackageRoot, ...packageName.split('/'));
}

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

export async function refreshCodeGraphyInstalledPlugins(
  options: RefreshCodeGraphyInstalledPluginsOptions,
): Promise<CodeGraphyInstalledPluginCache> {
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

export function enableCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  plugin: CodeGraphyInstalledPluginRecord,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const existingIndex = settings.plugins.findIndex(entry => entry.package === plugin.package);
  const entry = {
    package: plugin.package,
    ...(plugin.defaultOptions ? { options: { ...plugin.defaultOptions } } : {}),
  };

  const plugins = [...settings.plugins];
  if (existingIndex >= 0) {
    const mergedOptions = {
      ...plugin.defaultOptions,
      ...plugins[existingIndex]?.options,
    };
    plugins[existingIndex] = {
      ...plugins[existingIndex],
      package: plugin.package,
      ...(Object.keys(mergedOptions).length > 0 ? { options: mergedOptions } : {}),
    };
  } else {
    plugins.push(entry);
  }

  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins,
  });
}

export function disableCodeGraphyWorkspacePlugin(
  workspaceRoot: string,
  packageName: string,
): void {
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: settings.plugins.filter(plugin => plugin.package !== packageName),
  });
}
