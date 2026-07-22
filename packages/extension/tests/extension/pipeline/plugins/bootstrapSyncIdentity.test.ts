import { describe, expect, it, vi } from 'vitest';
import {
  createWorkspace,
  createPackageFixtureRoot,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
  syncWorkspacePipelinePlugins,
  fs,
  os,
  path,
} from './bootstrapFixture';

interface RegisteredCorePlugin {
  plugin: { id: string; version: string };
  builtIn: boolean;
  sourcePackage?: string;
  sourcePackageRoot?: string;
  options?: Record<string, unknown>;
  descriptorSignature?: string;
}

interface RegistrationOptions {
  builtIn?: boolean;
  sourcePackage?: string;
  sourcePackageRoot?: string;
  options?: Record<string, unknown>;
  descriptorSignature?: string;
}

interface RegisteredExtensionPlugin {
  plugin: { id: string; version: string };
  builtIn: boolean;
  sourcePackage?: string;
  sourcePackageRoot?: string;
  descriptorSignature?: string;
}

async function writeCorePluginRuntime(
  packageRoot: string,
  entry: string,
  pluginId: string,
  version: string,
): Promise<void> {
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(path.join(packageRoot, entry), `
export default function createPlugin() {
  return {
    id: ${JSON.stringify(pluginId)},
    name: ${JSON.stringify(pluginId)},
    version: ${JSON.stringify(version)},
    apiVersion: '^4.0.0',
    supportedExtensions: ['.txt']
  };
}
`, 'utf8');
}

async function writeExtensionPluginRuntime(
  packageRoot: string,
  entry: string,
  version: string,
  factoryMarkerPath?: string,
): Promise<void> {
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(path.join(packageRoot, entry), `
${factoryMarkerPath ? "import { appendFileSync } from 'node:fs';" : ''}
export default function createPlugin() {
  ${factoryMarkerPath
    ? `appendFileSync(${JSON.stringify(factoryMarkerPath)}, 'factory\\n');`
    : ''}
  return {
    id: 'acme.extension-linked',
    name: 'Linked Extension Plugin',
    version: ${JSON.stringify(version)},
    apiVersion: '^1.0.0'
  };
}
`, 'utf8');
}

function createCoreRegistry(registeredPlugins: Map<string, RegisteredCorePlugin>) {
  const extensionPlugins = {
    get: vi.fn(() => undefined),
    list: vi.fn(() => []),
    register: vi.fn(),
    unregister: vi.fn(),
    initializeAll: vi.fn(async () => undefined),
  };
  const registry = {
    extensionPlugins,
    get: vi.fn((pluginId: string) => registeredPlugins.get(pluginId)),
    list: vi.fn(() => [...registeredPlugins.values()]),
    register: vi.fn((plugin: RegisteredCorePlugin['plugin'], options: RegistrationOptions) => {
      registeredPlugins.set(plugin.id, {
        plugin,
        builtIn: Boolean(options.builtIn),
        sourcePackage: options.sourcePackage,
        sourcePackageRoot: options.sourcePackageRoot,
        options: options.options,
        descriptorSignature: options.descriptorSignature,
      });
    }),
    unregister: vi.fn((pluginId: string) => registeredPlugins.delete(pluginId)),
    initializePlugin: vi.fn(async () => undefined),
  };
  return registry;
}

describe('pipeline plugin sync identity', () => {
  it('does not construct another Extension runtime during an unchanged sync', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(await createPackageFixtureRoot('codegraphy-extension-noop-'), 'package');
    const factoryMarkerPath = path.join(path.dirname(packageRoot), 'factory-calls.txt');
    await writeExtensionPluginRuntime(packageRoot, 'plugin.js', '1.0.0', factoryMarkerPath);
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-extension-linked', version: '1.0.0',
        id: 'acme.extension-linked', host: 'codegraphy.extension', entry: './plugin.js',
        apiVersion: '^1.0.0', packageRoot, globallyEnabled: true,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(
      workspaceRoot,
      readCodeGraphyWorkspaceSettings(workspaceRoot),
    );
    const registered = new Map<string, RegisteredExtensionPlugin>();
    const extensionPlugins = {
      get: vi.fn((pluginId: string) => registered.get(pluginId)),
      list: vi.fn(() => [...registered.values()]),
      register: vi.fn((plugin: RegisteredExtensionPlugin['plugin'], options: RegistrationOptions) => {
        registered.set(plugin.id, {
          plugin,
          builtIn: Boolean(options.builtIn),
          sourcePackage: options.sourcePackage,
          sourcePackageRoot: options.sourcePackageRoot,
          descriptorSignature: options.descriptorSignature,
        });
      }),
      unregister: vi.fn((pluginId: string) => registered.delete(pluginId)),
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
    const dependencies = { getWorkspaceRoot: () => workspaceRoot, userHomeDir: homeDir };

    await syncWorkspacePipelinePlugins(registry as never, dependencies);
    extensionPlugins.register.mockClear();
    extensionPlugins.unregister.mockClear();
    await syncWorkspacePipelinePlugins(registry as never, dependencies);

    expect(await fs.readFile(factoryMarkerPath, 'utf8')).toBe('factory\n');
    expect(extensionPlugins.register).not.toHaveBeenCalled();
    expect(extensionPlugins.unregister).not.toHaveBeenCalled();
    expect([...registered.keys()]).toEqual(['acme.extension-linked']);
  });

  it('keeps multiple Core descriptors from one package registered by plugin ID', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(await createPackageFixtureRoot('codegraphy-core-multi-'), 'package');
    await writeCorePluginRuntime(packageRoot, 'first.js', 'acme.first', '1.0.0');
    await writeCorePluginRuntime(packageRoot, 'second.js', 'acme.second', '1.0.0');
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [
        {
          package: '@acme/codegraphy-multi', version: '1.0.0', id: 'acme.first', host: 'core',
          entry: './first.js', apiVersion: '^4.0.0', packageRoot, globallyEnabled: true,
        },
        {
          package: '@acme/codegraphy-multi', version: '1.0.0', id: 'acme.second', host: 'core',
          entry: './second.js', apiVersion: '^4.0.0', packageRoot, globallyEnabled: true,
        },
      ],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'acme.first', activation: 'enabled' },
        { id: 'acme.second', activation: 'enabled' },
      ],
    });
    const registered = new Map<string, RegisteredCorePlugin>();
    const registry = createCoreRegistry(registered);
    const dependencies = { getWorkspaceRoot: () => workspaceRoot, userHomeDir: homeDir };

    await syncWorkspacePipelinePlugins(registry as never, dependencies);
    registry.register.mockClear();
    registry.unregister.mockClear();
    registry.initializePlugin.mockClear();
    await syncWorkspacePipelinePlugins(registry as never, dependencies);

    expect([...registered.keys()]).toEqual(['acme.first', 'acme.second']);
    expect(registry.unregister).not.toHaveBeenCalled();
    expect(registry.register).not.toHaveBeenCalled();
    expect(registry.initializePlugin).not.toHaveBeenCalled();
  });

  it('replaces an initialized Core runtime when its descriptor identity changes', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(await createPackageFixtureRoot('codegraphy-core-linked-'), 'package');
    await writeCorePluginRuntime(packageRoot, 'plugin.js', 'acme.linked', '1.0.0');
    const writeInstalledRecord = (version: string): void => {
      writeCodeGraphyInstalledPluginCache({
        version: 3,
        plugins: [{
          package: '@acme/codegraphy-linked', version, id: 'acme.linked', host: 'core',
          entry: './plugin.js', apiVersion: '^4.0.0', packageRoot, globallyEnabled: true,
        }],
      }, { homeDir });
    };
    writeInstalledRecord('1.0.0');
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{ id: 'acme.linked', activation: 'enabled' }],
    });
    const registered = new Map<string, RegisteredCorePlugin>();
    const registry = createCoreRegistry(registered);
    const dependencies = { getWorkspaceRoot: () => workspaceRoot, userHomeDir: homeDir };

    await syncWorkspacePipelinePlugins(registry as never, dependencies);
    registry.register.mockClear();
    registry.unregister.mockClear();
    registry.initializePlugin.mockClear();
    await writeCorePluginRuntime(packageRoot, 'plugin.js', 'acme.linked', '2.0.0');
    writeInstalledRecord('2.0.0');
    await syncWorkspacePipelinePlugins(registry as never, dependencies);

    expect(registry.unregister).toHaveBeenCalledExactlyOnceWith('acme.linked');
    expect(registry.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acme.linked', version: '2.0.0' }),
      expect.objectContaining({ descriptorSignature: expect.any(String) }),
    );
    expect(registry.initializePlugin).toHaveBeenCalledExactlyOnceWith('acme.linked', workspaceRoot);
  });

  it('replaces an initialized Extension runtime when its descriptor identity changes', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(await createPackageFixtureRoot('codegraphy-extension-linked-'), 'package');
    await writeExtensionPluginRuntime(packageRoot, 'plugin.js', '1.0.0');
    const writeInstalledRecord = (version: string): void => {
      writeCodeGraphyInstalledPluginCache({
        version: 3,
        plugins: [{
          package: '@acme/codegraphy-extension-linked', version,
          id: 'acme.extension-linked', host: 'codegraphy.extension', entry: './plugin.js',
          apiVersion: '^1.0.0', packageRoot, globallyEnabled: true,
        }],
      }, { homeDir });
    };
    writeInstalledRecord('1.0.0');
    writeCodeGraphyWorkspaceSettings(
      workspaceRoot,
      readCodeGraphyWorkspaceSettings(workspaceRoot),
    );
    const registered = new Map<string, RegisteredExtensionPlugin>();
    const extensionPlugins = {
      get: vi.fn((pluginId: string) => registered.get(pluginId)),
      list: vi.fn(() => [...registered.values()]),
      register: vi.fn((plugin: RegisteredExtensionPlugin['plugin'], options: RegistrationOptions) => {
        registered.set(plugin.id, {
          plugin,
          builtIn: Boolean(options.builtIn),
          sourcePackage: options.sourcePackage,
          sourcePackageRoot: options.sourcePackageRoot,
          descriptorSignature: options.descriptorSignature,
        });
      }),
      unregister: vi.fn((pluginId: string) => registered.delete(pluginId)),
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
    const dependencies = { getWorkspaceRoot: () => workspaceRoot, userHomeDir: homeDir };

    await syncWorkspacePipelinePlugins(registry as never, dependencies);
    extensionPlugins.register.mockClear();
    extensionPlugins.unregister.mockClear();
    extensionPlugins.initializeAll.mockClear();
    await writeExtensionPluginRuntime(packageRoot, 'plugin.js', '2.0.0');
    writeInstalledRecord('2.0.0');
    await syncWorkspacePipelinePlugins(registry as never, dependencies);

    expect(extensionPlugins.unregister).toHaveBeenCalledExactlyOnceWith('acme.extension-linked');
    expect(extensionPlugins.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acme.extension-linked', version: '2.0.0' }),
      expect.objectContaining({ descriptorSignature: expect.any(String) }),
    );
    expect(extensionPlugins.initializeAll).toHaveBeenCalledExactlyOnceWith(workspaceRoot);
  });
});
