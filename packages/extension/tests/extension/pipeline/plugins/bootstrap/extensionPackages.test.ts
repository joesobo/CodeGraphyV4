import { describe, expect, it, vi } from 'vitest';
import {
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
} from '@codegraphy-dev/core';
import { loadWorkspaceExtensionPluginRegistrations } from '../../../../../src/extension/pipeline/plugins/bootstrap/extensionPackages';
import {
  createPackageFixtureRoot,
  createWorkspace,
  fs,
  os,
  path,
} from '../bootstrapFixture';

describe('pipeline/plugins linked package reloads', () => {
  it('keeps Extension descriptor metadata with its Extension registration', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = await createPackageFixtureRoot('codegraphy-extension-metadata-');
    await fs.writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({
      name: '@acme/codegraphy-extension-metadata',
      version: '1.0.0',
      type: 'module',
    }), 'utf8');
    await fs.writeFile(path.join(packageRoot, 'plugin.js'), `
export default function createPlugin() {
  return {
    id: 'acme.extension-metadata',
    name: 'Extension Metadata',
    version: '1.0.0',
    apiVersion: '^1.0.0'
  };
}
`, 'utf8');
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-extension-metadata',
        version: '1.0.0',
        id: 'acme.extension-metadata',
        host: 'codegraphy.extension',
        entry: './plugin.js',
        apiVersion: '^1.0.0',
        packageRoot,
        globallyEnabled: true,
        data: {
          legendEntries: [{
            id: 'acme:file',
            label: 'Acme file',
            pattern: '*.acme',
            color: '#0EA5E9',
            shape2D: 'hexagon',
          }],
        },
      }],
    }, { homeDir });

    const [registration] = await loadWorkspaceExtensionPluginRegistrations(
      readCodeGraphyWorkspaceSettings(workspaceRoot),
      workspaceRoot,
      { userHomeDir: homeDir },
    );

    expect(registration?.options.data).toEqual({
      legendEntries: [{
        id: 'acme:file',
        label: 'Acme file',
        pattern: '*.acme',
        color: '#0EA5E9',
        shape2D: 'hexagon',
      }],
    });
  });

  it('disposes an Extension runtime rejected by runtime API validation', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = await createPackageFixtureRoot('codegraphy-extension-rejected-');
    const unloadMarkerPath = path.join(packageRoot, 'unloaded.txt');
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({
        name: '@acme/codegraphy-extension-rejected',
        version: '1.0.0',
        type: 'module',
      }),
      'utf8',
    );
    await fs.writeFile(path.join(packageRoot, 'plugin.js'), `
import { writeFileSync } from 'node:fs';
export default function createPlugin() {
  return {
    id: 'acme.extension-rejected',
    name: 'Rejected Extension Plugin',
    version: '1.0.0',
    apiVersion: '^99.0.0',
    onUnload() { writeFileSync(${JSON.stringify(unloadMarkerPath)}, 'unloaded'); }
  };
}
`, 'utf8');
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-extension-rejected', version: '1.0.0',
        id: 'acme.extension-rejected', host: 'codegraphy.extension', entry: './plugin.js',
        apiVersion: '^1.0.0', packageRoot, globallyEnabled: true,
      }],
    }, { homeDir });

    await expect(loadWorkspaceExtensionPluginRegistrations(
      readCodeGraphyWorkspaceSettings(workspaceRoot),
      workspaceRoot,
      { userHomeDir: homeDir, warn: vi.fn() },
    )).resolves.toEqual([]);

    expect(await fs.readFile(unloadMarkerPath, 'utf8')).toBe('unloaded');
  });

  it('loads a rebuilt Extension plugin when only a transitive module changes', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = await createPackageFixtureRoot('codegraphy-extension-rebuild-');

    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({
        name: '@acme/codegraphy-extension-rebuild',
        version: '1.0.0',
        type: 'module',
      }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'plugin.js'),
      `
import { runtimeVersion } from './runtimeVersion.js';

export default function createPlugin() {
  return {
    id: 'acme.extension-rebuild',
    name: 'Rebuilt Extension Plugin',
    version: runtimeVersion,
    apiVersion: '^1.0.0'
  };
}
`,
      'utf-8',
    );
    const writeRuntimeVersion = async (runtimeVersion: string): Promise<void> => {
      await fs.writeFile(
        path.join(packageRoot, 'runtimeVersion.js'),
        `export const runtimeVersion = '${runtimeVersion}';\n`,
        'utf-8',
      );
    };
    await writeRuntimeVersion('runtime-v1');
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-extension-rebuild',
        version: '1.0.0',
        id: 'acme.extension-rebuild',
        host: 'codegraphy.extension',
        entry: './plugin.js',
        apiVersion: '^1.0.0',
        packageRoot,
        globallyEnabled: true,
      }],
    }, { homeDir });

    const dependencies = { userHomeDir: homeDir };
    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
    const [first] = await loadWorkspaceExtensionPluginRegistrations(
      settings,
      workspaceRoot,
      dependencies,
    );
    await writeRuntimeVersion('runtime-v2');
    const [second] = await loadWorkspaceExtensionPluginRegistrations(
      settings,
      workspaceRoot,
      dependencies,
    );

    expect(first?.plugin.version).toBe('runtime-v1');
    expect(second?.plugin.version).toBe('runtime-v2');
    expect(second?.options.sourcePackageRoot).not.toBe(first?.options.sourcePackageRoot);
  });
});
