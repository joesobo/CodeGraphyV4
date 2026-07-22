import fs from 'node:fs';
import path from 'node:path';
import {
  parseCodeGraphyPluginPackageManifest,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyPluginPackageDescriptor,
} from '@codegraphy-dev/core';
import {
  looseStringArraySchema,
  unknownRecordSchema,
} from '../../../src/shared/values';

interface CodeGraphyPluginDescriptor {
  supportedExtensions?: unknown;
}

interface AcceptanceInstalledPluginRecord extends CodeGraphyInstalledPluginRecord {
  defaultOptions?: Record<string, unknown>;
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
    `${JSON.stringify({ version: 3, plugins }, null, 2)}\n`,
  );
}

function readAcceptanceInstalledPluginRecord(packageRoot: string): AcceptanceInstalledPluginRecord {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const manifest = parseCodeGraphyPluginPackageManifest(
    JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')),
  );
  const descriptor = manifest?.plugins.find(
    (plugin: CodeGraphyPluginPackageDescriptor) => plugin.host === 'core',
  );
  const displayFields = readAcceptancePluginDisplayFields(packageRoot);

  if (!manifest || !descriptor) {
    throw new Error(`Acceptance plugin package is not a CodeGraphy plugin: ${packageRoot}`);
  }

  const record: AcceptanceInstalledPluginRecord = {
    package: manifest.package,
    version: manifest.version,
    packageRoot,
    globallyEnabled: false,
    ...descriptor,
    ...displayFields,
  };

  const metadata = JSON.parse(
    fs.readFileSync(path.join(packageRoot, 'codegraphy.json'), 'utf-8'),
  ) as Record<string, unknown>;
  const defaultOptions = unknownRecordSchema.safeParse(metadata.defaultOptions);
  if (defaultOptions.success) {
    record.defaultOptions = { ...defaultOptions.data };
  }

  return record;
}

function readAcceptancePluginDisplayFields(
  packageRoot: string,
): Pick<AcceptanceInstalledPluginRecord, 'supportedExtensions'> {
  const descriptorPath = path.join(packageRoot, 'codegraphy.json');
  const descriptor = JSON.parse(
    fs.readFileSync(descriptorPath, 'utf-8'),
  ) as CodeGraphyPluginDescriptor;
  const supportedExtensions = looseStringArraySchema.parse(descriptor.supportedExtensions);
  return {
    ...(supportedExtensions.length > 0 ? { supportedExtensions } : {}),
  };
}
