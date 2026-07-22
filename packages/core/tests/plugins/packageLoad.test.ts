import { describe, expect, it } from 'vitest';
import {
  type CodeGraphyInstalledPluginRecord,
} from '../../src';
import { loadCodeGraphyWorkspacePluginPackage } from '../../src/plugins/packageLoad';
import {
  createPackageFixtureRoot,
  fs,
  path,
} from './packageRuntimeFixture';

describe('CodeGraphy package loading', () => {
  it.each([
    {
      runtimeId: 'acme.other',
      runtimeApiVersion: '^4.0.0',
      expectedError: "exported plugin id 'acme.other'",
    },
    {
      runtimeId: 'acme.rejected',
      runtimeApiVersion: '^99.0.0',
      expectedError: "targets unsupported CodeGraphy Plugin API '^99.0.0'",
    },
  ])('disposes a runtime rejected by $expectedError validation', async ({
    runtimeApiVersion,
    runtimeId,
    expectedError,
  }) => {
    const packageRoot = await createPackageFixtureRoot('codegraphy-package-rejected-');
    const unloadMarkerPath = path.join(packageRoot, 'unloaded.txt');
    const record = {
      package: '@acme/codegraphy-plugin-rejected',
      version: '1.0.0',
      id: 'acme.rejected',
      host: 'core',
      entry: './plugin.js',
      apiVersion: '^4.0.0',
      packageRoot,
      globallyEnabled: true,
    } satisfies CodeGraphyInstalledPluginRecord;
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: record.package, version: record.version, type: 'module' }),
      'utf8',
    );
    await fs.writeFile(path.join(packageRoot, 'plugin.js'), `
import { writeFileSync } from 'node:fs';
export default function createPlugin() {
  return {
    id: ${JSON.stringify(runtimeId)},
    name: 'Rejected Plugin',
    version: '1.0.0',
    apiVersion: ${JSON.stringify(runtimeApiVersion)},
    supportedExtensions: [],
    onUnload() { writeFileSync(${JSON.stringify(unloadMarkerPath)}, 'unloaded'); }
  };
}
`, 'utf8');

    await expect(loadCodeGraphyWorkspacePluginPackage(
      { id: record.id, activation: 'enabled' },
      record,
    )).rejects.toThrow(expectedError);

    expect(await fs.readFile(unloadMarkerPath, 'utf8')).toBe('unloaded');
  });

  it('loads a rebuilt plugin when its package version does not change', async () => {
    const packageRoot = await createPackageFixtureRoot('codegraphy-package-rebuild-');
    const record = {
      package: '@acme/codegraphy-plugin-rebuild',
      version: '1.0.0',
      id: 'acme.rebuild',
      host: 'core',
      entry: './plugin.js',
      apiVersion: '^4.0.0',
      packageRoot,
      globallyEnabled: true,
    } satisfies CodeGraphyInstalledPluginRecord;

    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: record.package, version: record.version, type: 'module' }),
      'utf-8',
    );
    const writeRuntime = async (runtimeVersion: string): Promise<void> => {
      await fs.writeFile(
        path.join(packageRoot, 'plugin.js'),
        `
export default function createPlugin() {
  return {
    id: 'acme.rebuild',
    name: 'Rebuilt Plugin',
    version: '${runtimeVersion}',
    apiVersion: '^4.0.0',
    supportedExtensions: []
  };
}
`,
        'utf-8',
      );
    };

    await writeRuntime('runtime-v1');
    const first = await loadCodeGraphyWorkspacePluginPackage(
      { id: record.id, activation: 'enabled' },
      record,
    );
    await writeRuntime('runtime-v2');
    const second = await loadCodeGraphyWorkspacePluginPackage(
      { id: record.id, activation: 'enabled' },
      record,
    );

    expect(first.plugin.version).toBe('runtime-v1');
    expect(second.plugin.version).toBe('runtime-v2');
  });
});
