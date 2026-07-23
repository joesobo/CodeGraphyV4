import { describe, expect, it, vi } from 'vitest';
import {
  createPackageFixtureRoot,
  createWorkspace,
  fs,
  os,
  path,
  readCodeGraphyWorkspaceSettings,
  syncWorkspacePipelinePlugins,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '../bootstrapFixture';
import {
  createCoreRegistry,
  type RegisteredCorePlugin,
  type RegisteredExtensionPlugin,
  type RegistrationOptions,
} from './syncFixture';

async function writeOrderedPluginRuntime(options: {
  apiVersion: string;
  entry: string;
  markerPath: string;
  packageRoot: string;
  pluginId: string;
  runtimeVersion: string;
}): Promise<void> {
  await fs.mkdir(options.packageRoot, { recursive: true });
  await fs.writeFile(path.join(options.packageRoot, options.entry), `
import { appendFileSync } from 'node:fs';
appendFileSync(${JSON.stringify(options.markerPath)}, 'import-${options.runtimeVersion}\\n');
export default function createPlugin() {
  return {
    id: ${JSON.stringify(options.pluginId)},
    name: ${JSON.stringify(options.pluginId)},
    version: ${JSON.stringify(options.runtimeVersion)},
    apiVersion: ${JSON.stringify(options.apiVersion)},
    supportedExtensions: [],
    onUnload() {
      appendFileSync(${JSON.stringify(options.markerPath)}, 'unload-${options.runtimeVersion}\\n');
    }
  };
}
`, 'utf8');
}

describe('pipeline plugin sync lifecycle order', () => {
  it('unloads a changed Core runtime before importing its replacement', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(await createPackageFixtureRoot('codegraphy-core-order-'), 'package');
    const markerPath = path.join(path.dirname(packageRoot), 'lifecycle-order.txt');
    const record = {
      package: '@acme/codegraphy-core-order', version: '1.0.0', id: 'acme.core-order',
      host: 'core', entry: './plugin.js', apiVersion: '^4.0.0', packageRoot,
      globallyEnabled: true,
    } as const;
    await writeOrderedPluginRuntime({
      apiVersion: record.apiVersion,
      entry: record.entry,
      markerPath,
      packageRoot,
      pluginId: record.id,
      runtimeVersion: 'v1',
    });
    writeCodeGraphyInstalledPluginCache({ version: 3, plugins: [record] }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{ id: record.id, activation: 'enabled' }],
    });
    const registered = new Map<string, RegisteredCorePlugin>();
    const registry = createCoreRegistry(registered);
    registry.unregister.mockImplementation((pluginId: string) => {
      const current = registered.get(pluginId)?.plugin as { onUnload?(): void } | undefined;
      current?.onUnload?.();
      return registered.delete(pluginId);
    });
    const dependencies = { getWorkspaceRoot: () => workspaceRoot, userHomeDir: homeDir };

    await syncWorkspacePipelinePlugins(registry as never, dependencies);
    await writeOrderedPluginRuntime({
      apiVersion: record.apiVersion,
      entry: record.entry,
      markerPath,
      packageRoot,
      pluginId: record.id,
      runtimeVersion: 'v2',
    });
    await syncWorkspacePipelinePlugins(registry as never, dependencies);

    expect(await fs.readFile(markerPath, 'utf8')).toBe([
      'import-v1',
      'unload-v1',
      'import-v2',
      '',
    ].join('\n'));
  });

  it('unloads a changed Extension runtime before importing its replacement', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(await createPackageFixtureRoot('codegraphy-extension-order-'), 'package');
    const markerPath = path.join(path.dirname(packageRoot), 'lifecycle-order.txt');
    const record = {
      package: '@acme/codegraphy-extension-order', version: '1.0.0',
      id: 'acme.extension-linked', host: 'codegraphy.extension', entry: './plugin.js',
      apiVersion: '^1.0.0', packageRoot, globallyEnabled: true,
    } as const;
    await writeOrderedPluginRuntime({
      apiVersion: record.apiVersion,
      entry: record.entry,
      markerPath,
      packageRoot,
      pluginId: record.id,
      runtimeVersion: 'v1',
    });
    writeCodeGraphyInstalledPluginCache({ version: 3, plugins: [record] }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{ id: record.id, activation: 'enabled' }],
    });
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
      unregister: vi.fn((pluginId: string) => {
        const current = registered.get(pluginId)?.plugin as { onUnload?(): void } | undefined;
        current?.onUnload?.();
        return registered.delete(pluginId);
      }),
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
    await writeOrderedPluginRuntime({
      apiVersion: record.apiVersion,
      entry: record.entry,
      markerPath,
      packageRoot,
      pluginId: record.id,
      runtimeVersion: 'v2',
    });
    await syncWorkspacePipelinePlugins(registry as never, dependencies);

    expect(await fs.readFile(markerPath, 'utf8')).toBe([
      'import-v1',
      'unload-v1',
      'import-v2',
      '',
    ].join('\n'));
  });
});
