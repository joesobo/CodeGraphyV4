import { describe, expect, it, vi } from 'vitest';
import {
  createRegistry,
  createWorkspace,
  createPackageFixtureRoot,
  createExtensionPluginPackage,
  createIncompatibleExtensionPluginPackageWithRuntimeMarkers,
  createPluginPackage,
  createManifestPluginPackage,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
  initializeWorkspacePipeline,
  fs,
  os,
  path,
} from './bootstrapFixture';

describe('pipeline/plugins/bootstrap packages', () => {
  it('rejects an incompatible Extension descriptor before importing its runtime', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-extension-global-'),
      'node_modules',
      '@acme',
      'codegraphy-extension-incompatible',
    );
    const markers = await createIncompatibleExtensionPluginPackageWithRuntimeMarkers(packageRoot);
    const warn = vi.fn();

    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-extension-incompatible',
        version: '1.0.0',
        id: 'acme.extension-incompatible',
        host: 'codegraphy.extension',
        entry: './plugin.js',
        apiVersion: '^99.0.0',
        packageRoot,
        globallyEnabled: true,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(
      workspaceRoot,
      readCodeGraphyWorkspaceSettings(workspaceRoot),
    );

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
      warn,
    });

    expect(warn).toHaveBeenCalledWith(
      "CodeGraphy Extension plugin 'acme.extension-incompatible' could not be loaded: Extension plugin descriptor 'acme.extension-incompatible' requires API '^99.0.0', but the VS Code extension provides '1.0.0'.",
    );
    expect(registry.extensionPlugins.register).not.toHaveBeenCalled();
    await expect(fs.access(markers.importMarkerPath)).rejects.toThrow();
    await expect(fs.access(markers.factoryMarkerPath)).rejects.toThrow();
  });

  it('loads an enabled Extension plugin through the Extension Plugin API only', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-extension-global-'),
      'node_modules',
      '@acme',
      'codegraphy-extension-particles',
    );

    await createExtensionPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-extension-particles',
        version: '1.0.0',
        id: 'acme.particles',
        host: 'codegraphy.extension',
        entry: './plugin.js',
        apiVersion: '^1.0.0',
        packageRoot,
        globallyEnabled: true,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(
      workspaceRoot,
      readCodeGraphyWorkspaceSettings(workspaceRoot),
    );

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    expect(registry.extensionPlugins.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acme.particles' }),
      expect.objectContaining({
        sourcePackage: '@acme/codegraphy-extension-particles',
        sourcePackageRoot: packageRoot,
      }),
    );
    expect(registry.extensionPlugins.initializeAll).toHaveBeenCalledWith(workspaceRoot);
    expect(registry.register.mock.calls.map(([plugin]) => plugin.id)).not.toContain('acme.particles');
  });

  it('prefers a bundled plugin package over a stale installed package record', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageName = '@acme/codegraphy-plugin-bundled';
    const pluginId = 'acme.bundled';
    const stalePackageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-extension-global-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-bundled',
    );
    const bundledPackageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-extension-bundled-'),
      'codegraphy-plugin-bundled',
    );

    await createManifestPluginPackage(stalePackageRoot, {
      marker: 'stale-installed',
      packageName,
      pluginId,
      version: '1.0.0',
    });
    await createManifestPluginPackage(bundledPackageRoot, {
      marker: 'fresh-bundled',
      packageName,
      pluginId,
      version: '1.0.1',
    });
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: packageName,
        version: '1.0.0',
        id: pluginId,
        name: 'Bundled',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot: stalePackageRoot,
        globallyEnabled: false,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'codegraphy.markdown', activation: 'enabled' },
        { id: pluginId, activation: 'enabled' },
      ],
    });

    await initializeWorkspacePipeline(registry as never, {
      bundledPluginPackageRoots: [bundledPackageRoot],
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
      warn: message => {
        throw new Error(message);
      },
    });

    const bundledRegistration = registry.register.mock.calls.find(
      ([plugin]) => plugin.id === pluginId,
    );

    expect(bundledRegistration?.[1]).toEqual({
      builtIn: true,
      sourcePackage: packageName,
      sourcePackageRoot: bundledPackageRoot,
      descriptorSignature: expect.any(String),
      interfaces: [{
        id: 'codegraphy.extension',
        data: {
          fileColors: {
            '*.txt': expect.objectContaining({
              marker: 'fresh-bundled',
              shape2D: 'triangle',
              imagePath: 'assets/example.svg',
            }),
          },
        },
      }],
    });
    expect(registry.register.mock.calls.map(([plugin]) => plugin.id)).toEqual([
      'codegraphy.markdown',
      pluginId,
    ]);
  });

  it('registers enabled npm plugin packages for the current CodeGraphy Workspace', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-extension-global-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-bootstrap',
    );

    await createPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        version: '1.0.0',
        id: 'acme.extension-bootstrap',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot,
        globallyEnabled: false,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'codegraphy.markdown',
        activation: 'enabled',
      }, {
        id: 'acme.extension-bootstrap',
        activation: 'enabled',
        options: {
          mode: 'strict',
        },
      }],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
      warn: vi.fn(),
    });

    expect(registry.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acme.extension-bootstrap' }),
      expect.objectContaining({
        sourcePackage: '@acme/codegraphy-plugin-extension-bootstrap',
        options: {
          mode: 'strict',
        },
      }),
    );
    expect(registry.register).toHaveBeenCalledTimes(2);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
  });

  it('warns and skips an incompatible installed plugin without aborting initialization', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-extension-global-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-bootstrap',
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await createPluginPackage(packageRoot, '^2.0.0');
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        id: 'acme.extension-bootstrap',
        host: 'core',
        entry: './plugin.js',
        packageRoot,
        globallyEnabled: false,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'codegraphy.markdown', activation: 'enabled' },
        { id: 'acme.extension-bootstrap', activation: 'enabled' },
      ],
    });
    await expect(initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    })).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      "CodeGraphy plugin 'acme.extension-bootstrap' could not be loaded: Plugin descriptor 'acme.extension-bootstrap' targets unsupported CodeGraphy Plugin API '^2.0.0'. Host provides '4.0.0'.",
    );
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
    warn.mockRestore();
  });

  it('does not register installed package plugins that are not enabled for the current CodeGraphy Workspace', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-extension-global-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-bootstrap',
    );

    await createPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        version: '1.0.0',
        id: 'acme.extension-bootstrap',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot,
        globallyEnabled: false,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{ id: 'codegraphy.markdown', activation: 'enabled' }],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    expect(
      registry.register.mock.calls.map(([plugin]) => plugin.id),
    ).toEqual(['codegraphy.markdown']);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
  });
});
