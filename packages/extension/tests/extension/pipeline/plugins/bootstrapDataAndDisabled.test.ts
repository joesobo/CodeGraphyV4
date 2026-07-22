import { describe, expect, it } from 'vitest';
import {
  createRegistry,
  createWorkspace,
  createPackageFixtureRoot,
  createPluginPackageWithRuntimeMarkers,
  createDataHostPluginPackage,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
  initializeWorkspacePipeline,
  fs,
  os,
  path,
} from './bootstrapFixture';

describe('pipeline/plugins/bootstrap plugin data and disabled plugins', () => {
  it('passes workspace plugin data host to package factories in the extension pipeline', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-extension-global-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-data-host',
    );

    await createDataHostPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-data-host',
        version: '1.0.0',
        apiVersion: '^3.0.0',
        disclosures: ['workspaceWrites'],
        packageRoot,
        pluginId: 'acme.extension-data-host',
        defaultOptions: {
          mode: 'default',
        },
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'acme.extension-data-host',
        enabled: true,
        options: {
        },
      }],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });
    const plugin = registry.register.mock.calls
      .map(([registeredPlugin]) => registeredPlugin)
      .find(registeredPlugin => registeredPlugin.id === 'acme.extension-data-host');

    await plugin?.initialize?.(workspaceRoot);

    expect(registry.register.mock.calls.map(([registeredPlugin]) => registeredPlugin.id)).toEqual([
      'acme.extension-data-host',
    ]);
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).pluginData).toEqual({
      'acme.extension-data-host': {
        mode: 'default',
      },
    });
  });

  it('does not register Markdown when the workspace plugins array removes it', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
    });

    expect(
      registry.register.mock.calls.map(([plugin]) => plugin.id),
    ).toEqual([]);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
  });

  it('does not register disabled Markdown or package runtimes during extension pipeline initialization', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-extension-global-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-bootstrap',
    );
    const { factoryMarkerPath, importMarkerPath } = await createPluginPackageWithRuntimeMarkers(packageRoot);

    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        version: '1.0.0',
        apiVersion: '^3.0.0',
        disclosures: [],
        packageRoot,
        pluginId: 'acme.extension-bootstrap',
        pluginName: 'Extension Bootstrap',
        supportedExtensions: ['.txt'],
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: 'acme.extension-bootstrap', enabled: true },
      ],
    });

    await initializeWorkspacePipeline(registry as never, {
      disabledPlugins: new Set(['codegraphy.markdown', 'acme.extension-bootstrap']),
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    expect(registry.register.mock.calls.map(([plugin]) => plugin.id)).toEqual([]);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
    await expect(fs.access(importMarkerPath)).rejects.toThrow();
    await expect(fs.access(factoryMarkerPath)).rejects.toThrow();
  });
});
