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
  const plugins = pluginPackageRelativePaths.flatMap(relativePath =>
    readAcceptanceInstalledPluginRecords(path.resolve(repoRoot, relativePath)),
  );
  const userDirectoryPath = path.join(homeDir, '.codegraphy');

  fs.mkdirSync(userDirectoryPath, { recursive: true });
  fs.writeFileSync(
    path.join(userDirectoryPath, 'plugins.json'),
    `${JSON.stringify({ version: 3, plugins }, null, 2)}\n`,
  );
}

function readAcceptanceInstalledPluginRecords(packageRoot: string): AcceptanceInstalledPluginRecord[] {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const manifest = parseCodeGraphyPluginPackageManifest(
    JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')),
  );
  if (!manifest) {
    throw new Error(`Acceptance plugin package is not a CodeGraphy plugin: ${packageRoot}`);
  }

  return manifest.plugins.map((descriptor: CodeGraphyPluginPackageDescriptor) => {
    const metadata = unknownRecordSchema.safeParse(descriptor.data);
    const defaultOptions = unknownRecordSchema.safeParse(
      metadata.success ? metadata.data.defaultOptions : undefined,
    );
    const supportedExtensions = looseStringArraySchema.parse(
      metadata.success ? metadata.data.supportedExtensions : undefined,
    );

    return {
      package: manifest.package,
      version: manifest.version,
      packageRoot,
      globallyEnabled: false,
      ...descriptor,
      ...(supportedExtensions.length > 0 ? { supportedExtensions } : {}),
      ...(defaultOptions.success ? { defaultOptions: { ...defaultOptions.data } } : {}),
    };
  });
}
