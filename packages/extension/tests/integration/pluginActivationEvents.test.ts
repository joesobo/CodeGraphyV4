import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

interface ExtensionManifest {
  activationEvents?: string[];
  codegraphy?: {
    plugins?: Array<{ host?: string }>;
  };
  contributes?: unknown;
  extensionDependencies?: string[];
}

const pluginPackages = [
  'plugin-typescript',
  'plugin-godot',
] as const;

function readManifest(packageName: typeof pluginPackages[number]): ExtensionManifest {
  const manifestPath = path.resolve(__dirname, `../../../../packages/${packageName}/package.json`);
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ExtensionManifest;
}

describe('first-party language plugin package manifests', () => {
  it.each(pluginPackages)('%s is a headless CodeGraphy plugin package', (packageName) => {
    const manifest = readManifest(packageName);

    expect(manifest.codegraphy?.plugins).toEqual(
      expect.arrayContaining([expect.objectContaining({ host: 'core' })]),
    );
    expect(manifest.extensionDependencies).toBeUndefined();
    expect(manifest.activationEvents).toBeUndefined();
    expect(manifest.contributes).toBeUndefined();
  });
});
