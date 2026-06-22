import fs from 'node:fs';
import path from 'node:path';

interface CodeGraphyPluginPackageJson {
  name?: unknown;
  version?: unknown;
  codegraphy?: {
    apiVersion?: unknown;
    disclosures?: unknown;
    defaultOptions?: unknown;
    type?: unknown;
  };
}

interface CodeGraphyPluginDescriptor {
  id?: unknown;
  name?: unknown;
  supportedExtensions?: unknown;
}

interface AcceptanceInstalledPluginRecord {
  package: string;
  version: string;
  apiVersion: string;
  packageRoot: string;
  defaultOptions?: Record<string, unknown>;
  disclosures: string[];
  pluginId?: string;
  pluginName?: string;
  supportedExtensions?: string[];
}

export function acceptancePluginPackageRelativePathsForExample(exampleName: string | undefined): string[] {
  switch (exampleName) {
    case 'example-javascript':
    case 'example-typescript':
      return ['packages/plugin-typescript'];
    case 'example-godot':
      return ['packages/plugin-godot'];
    case 'example-unity':
      return ['packages/plugin-unity'];
    case 'example-svelte':
      return ['packages/plugin-svelte'];
    case 'example-vue':
      return ['packages/plugin-vue'];
    default:
      return [];
  }
}

export function writeAcceptanceInstalledPluginCache(
  homeDir: string,
  repoRoot: string,
  pluginPackageRelativePaths: readonly string[],
): void {
  const plugins = pluginPackageRelativePaths.map(relativePath =>
    readAcceptanceInstalledPluginRecord(path.resolve(repoRoot, relativePath)),
  );
  const userDirectoryPath = path.join(homeDir, '.codegraphy');

  fs.mkdirSync(userDirectoryPath, { recursive: true });
  fs.writeFileSync(
    path.join(userDirectoryPath, 'plugins.json'),
    `${JSON.stringify({ version: 1, plugins }, null, 2)}\n`,
  );
}

function readAcceptanceInstalledPluginRecord(packageRoot: string): AcceptanceInstalledPluginRecord {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as CodeGraphyPluginPackageJson;
  const packageName = readRequiredString(packageJson.name, `${packageJsonPath} name`);
  const version = readRequiredString(packageJson.version, `${packageJsonPath} version`);
  const codegraphy = packageJson.codegraphy;
  const displayFields = readAcceptancePluginDisplayFields(packageRoot);

  if (codegraphy?.type !== 'plugin') {
    throw new Error(`Acceptance plugin package is not a CodeGraphy plugin: ${packageRoot}`);
  }

  const record: AcceptanceInstalledPluginRecord = {
    package: packageName,
    version,
    apiVersion: readRequiredString(codegraphy.apiVersion, `${packageJsonPath} codegraphy.apiVersion`),
    packageRoot,
    disclosures: readStringArray(codegraphy.disclosures),
    ...displayFields,
  };

  if (isRecord(codegraphy.defaultOptions)) {
    record.defaultOptions = { ...codegraphy.defaultOptions };
  }

  return record;
}

function readAcceptancePluginDisplayFields(
  packageRoot: string,
): Pick<AcceptanceInstalledPluginRecord, 'pluginId' | 'pluginName' | 'supportedExtensions'> {
  const descriptorPath = path.join(packageRoot, 'codegraphy.json');
  const descriptor = JSON.parse(
    fs.readFileSync(descriptorPath, 'utf-8'),
  ) as CodeGraphyPluginDescriptor;
  const pluginId = readOptionalString(descriptor.id);
  if (!pluginId) {
    throw new Error(`Acceptance plugin package is missing codegraphy.json id: ${packageRoot}`);
  }

  const pluginName = readOptionalString(descriptor.name);
  const supportedExtensions = readStringArray(descriptor.supportedExtensions);
  return {
    pluginId,
    ...(pluginName ? { pluginName } : {}),
    ...(supportedExtensions.length > 0 ? { supportedExtensions } : {}),
  };
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string`);
  }

  return value;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
