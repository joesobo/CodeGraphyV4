import { vi } from 'vitest';
import { fs, path } from '../bootstrapFixture';

export interface RegisteredCorePlugin {
  plugin: { id: string; version: string };
  builtIn: boolean;
  sourcePackage?: string;
  sourcePackageRoot?: string;
  options?: Record<string, unknown>;
  descriptorSignature?: string;
  sourceSignature?: string;
}

export interface RegistrationOptions {
  builtIn?: boolean;
  sourcePackage?: string;
  sourcePackageRoot?: string;
  options?: Record<string, unknown>;
  descriptorSignature?: string;
  sourceSignature?: string;
}

export interface RegisteredExtensionPlugin {
  plugin: { id: string; version: string };
  builtIn: boolean;
  sourcePackage?: string;
  sourcePackageRoot?: string;
  descriptorSignature?: string;
}

export async function writeCorePluginRuntime(
  packageRoot: string,
  entry: string,
  pluginId: string,
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
    id: ${JSON.stringify(pluginId)},
    name: ${JSON.stringify(pluginId)},
    version: ${JSON.stringify(version)},
    apiVersion: '^4.0.0',
    supportedExtensions: ['.txt']
  };
}
`, 'utf8');
}

export async function writeExtensionPluginRuntime(
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

export function createCoreRegistry(registeredPlugins: Map<string, RegisteredCorePlugin>) {
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
        sourceSignature: options.sourceSignature,
      });
    }),
    unregister: vi.fn((pluginId: string) => registeredPlugins.delete(pluginId)),
    initializePlugin: vi.fn(async () => undefined),
  };
  return registry;
}
