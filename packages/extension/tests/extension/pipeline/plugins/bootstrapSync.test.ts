import { describe, expect, it, vi } from 'vitest';
import {
  createWorkspace,
  createPackageFixtureRoot,
  createExtensionPluginPackage,
  createPluginPackage,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
  syncWorkspacePipelinePlugins,
  fs,
  os,
  path,
} from './bootstrapFixture';

describe('pipeline/plugins/bootstrap synchronization', () => {
  const createEmptyExtensionRegistry = () => ({
    get: vi.fn(() => undefined),
    list: vi.fn(() => []),
    register: vi.fn(),
    unregister: vi.fn(),
    initializeAll: vi.fn(async () => undefined),
  });

  it('syncs Extension plugins through the Extension Plugin API registry', async () => {
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
    const extensionPlugins = {
      get: vi.fn(() => undefined),
      list: vi.fn(() => []),
      register: vi.fn(),
      unregister: vi.fn(),
      initializeAll: vi.fn(async () => undefined),
    };
    const registry = {
      extensionPlugins,
      get: vi.fn(() => undefined),
      list: vi.fn(() => []),
      register: vi.fn(),
      unregister: vi.fn(),
      initializePlugin: vi.fn(async () => undefined),
    };

    await syncWorkspacePipelinePlugins(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    expect(extensionPlugins.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acme.particles' }),
      expect.objectContaining({ sourcePackageRoot: packageRoot }),
    );
    expect(extensionPlugins.initializeAll).toHaveBeenCalledWith(workspaceRoot);
    expect(registry.register).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acme.particles' }),
      expect.anything(),
    );
  });

  it('syncs workspace plugin selection without unregistering core Tree-sitter analysis', async () => {
    const workspaceRoot = await createWorkspace();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [],
    });
    const registeredPlugins = new Map<string, {
      plugin: { id: string };
      builtIn: boolean;
      sourcePackage?: string;
      sourcePackageRoot?: string;
      options?: Record<string, unknown>;
    }>([
      [
        'codegraphy.markdown',
        {
          plugin: { id: 'codegraphy.markdown' },
          builtIn: true,
          sourcePackage: '@codegraphy-dev/plugin-markdown',
        },
      ],
    ]);
    const registry = {
      extensionPlugins: createEmptyExtensionRegistry(),
      get: vi.fn((pluginId: string) => registeredPlugins.get(pluginId)),
      list: vi.fn(() => [...registeredPlugins.values()]),
      register: vi.fn(),
      unregister: vi.fn((pluginId: string) => registeredPlugins.delete(pluginId)),
      initializePlugin: vi.fn(async () => undefined),
    };

    await syncWorkspacePipelinePlugins(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
    });

    expect(registry.unregister).toHaveBeenCalledTimes(1);
    expect(registry.unregister).toHaveBeenCalledWith('codegraphy.markdown');
    expect(registry.register).not.toHaveBeenCalled();
    expect(registry.initializePlugin).not.toHaveBeenCalled();
  });

  it('syncs newly enabled package plugins without re-registering existing plugins', async () => {
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
      plugins: [
        { id: 'codegraphy.markdown', activation: 'enabled' },
        { id: 'acme.extension-bootstrap', activation: 'enabled' },
      ],
    });
    const registeredPlugins = new Map<string, {
      plugin: { id: string };
      builtIn: boolean;
      sourcePackage?: string;
      sourcePackageRoot?: string;
      options?: Record<string, unknown>;
    }>([
      [
        'codegraphy.markdown',
        {
          plugin: { id: 'codegraphy.markdown' },
          builtIn: true,
          sourcePackage: '@codegraphy-dev/plugin-markdown',
        },
      ],
    ]);
    const registry = {
      extensionPlugins: createEmptyExtensionRegistry(),
      get: vi.fn((pluginId: string) => registeredPlugins.get(pluginId)),
      list: vi.fn(() => [...registeredPlugins.values()]),
      register: vi.fn((plugin, options) => {
        registeredPlugins.set(plugin.id, {
          plugin,
          builtIn: Boolean(options.builtIn),
          sourcePackage: options.sourcePackage,
          sourcePackageRoot: options.sourcePackageRoot,
          options: options.options,
        });
      }),
      unregister: vi.fn((pluginId: string) => registeredPlugins.delete(pluginId)),
      initializePlugin: vi.fn(async () => undefined),
    };

    await syncWorkspacePipelinePlugins(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    expect(registry.unregister).not.toHaveBeenCalled();
    expect(registry.register).toHaveBeenCalledTimes(1);
    expect(registry.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acme.extension-bootstrap' }),
      expect.objectContaining({
        sourcePackage: '@acme/codegraphy-plugin-extension-bootstrap',
      }),
    );
    expect(registry.initializePlugin).toHaveBeenCalledWith(
      'acme.extension-bootstrap',
      workspaceRoot,
    );
    expect(registry.initializePlugin).toHaveBeenCalledTimes(1);
  });
});
