import { describe, expect, it, vi } from 'vitest';
import {
  createWorkspace,
  createPackageFixtureRoot,
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
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        version: '1.0.0',
        apiVersion: '^3.0.0',
        disclosures: [],
        packageRoot,
        pluginId: 'acme.extension-bootstrap',
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: 'acme.extension-bootstrap', enabled: true },
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
