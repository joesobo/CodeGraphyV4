import fs from 'node:fs';
import path from 'node:path';
import {
  looseStringArraySchema,
  nonEmptyStringSchema,
  unknownRecordSchema,
} from '../../../src/shared/values';

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
  const packageName = readRequiredNonEmptyString(packageJson.name, `${packageJsonPath} name`);
  const version = readRequiredNonEmptyString(packageJson.version, `${packageJsonPath} version`);
  const codegraphy = packageJson.codegraphy;
  const displayFields = readAcceptancePluginDisplayFields(packageRoot);

  if (codegraphy?.type !== 'plugin') {
    throw new Error(`Acceptance plugin package is not a CodeGraphy plugin: ${packageRoot}`);
  }

  const record: AcceptanceInstalledPluginRecord = {
    package: packageName,
    version,
    apiVersion: readRequiredNonEmptyString(codegraphy.apiVersion, `${packageJsonPath} codegraphy.apiVersion`),
    packageRoot,
    disclosures: looseStringArraySchema.parse(codegraphy.disclosures),
    ...displayFields,
  };

  const defaultOptions = unknownRecordSchema.safeParse(codegraphy.defaultOptions);
  if (defaultOptions.success) {
    record.defaultOptions = { ...defaultOptions.data };
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
  const pluginId = readOptionalNonEmptyString(descriptor.id);
  if (!pluginId) {
    throw new Error(`Acceptance plugin package is missing codegraphy.json id: ${packageRoot}`);
  }

  const pluginName = readOptionalNonEmptyString(descriptor.name);
  const supportedExtensions = looseStringArraySchema.parse(descriptor.supportedExtensions);
  return {
    pluginId,
    ...(pluginName ? { pluginName } : {}),
    ...(supportedExtensions.length > 0 ? { supportedExtensions } : {}),
  };
}

function readRequiredNonEmptyString(value: unknown, label: string): string {
  const parsed = nonEmptyStringSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Expected ${label} to be a non-empty string`);
  }

  return parsed.data;
}

function readOptionalNonEmptyString(value: unknown): string | undefined {
  const parsed = nonEmptyStringSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

