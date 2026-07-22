import { describe, expect, it, vi } from 'vitest';
import { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
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
} from './bootstrapFixture';

interface RuntimeFixture {
  apiVersion: string;
  host: 'core' | 'codegraphy.extension';
  id: string;
  markerPath: string;
  packageName: string;
  packageRoot: string;
}

async function writeRuntime(fixture: RuntimeFixture): Promise<void> {
  const supportedExtensions = fixture.host === 'core'
    ? "supportedExtensions: ['.txt'],"
    : '';
  await fs.mkdir(fixture.packageRoot, { recursive: true });
  await fs.writeFile(path.join(fixture.packageRoot, 'plugin.js'), `
import { writeFileSync } from 'node:fs';

export default function createPlugin() {
  return {
    id: ${JSON.stringify(fixture.id)},
    name: ${JSON.stringify(fixture.id)},
    version: '1.0.0',
    apiVersion: ${JSON.stringify(fixture.apiVersion)},
    ${supportedExtensions}
    initialize() {
      writeFileSync(${JSON.stringify(fixture.markerPath)}, 'initialized');
    }
  };
}
`, 'utf8');
}

function installedRecord(fixture: RuntimeFixture) {
  return {
    package: fixture.packageName,
    version: '1.0.0',
    id: fixture.id,
    host: fixture.host,
    entry: './plugin.js',
    apiVersion: fixture.host === 'core' ? '^4.0.0' : '^1.0.0',
    packageRoot: fixture.packageRoot,
    globallyEnabled: true,
  };
}

async function createRuntimeFixture(
  host: RuntimeFixture['host'],
  id: string,
  apiVersion: string,
): Promise<RuntimeFixture> {
  const packageRoot = path.join(
    await createPackageFixtureRoot(`codegraphy-${id.replace(/\./g, '-')}-`),
    'package',
  );
  return {
    apiVersion,
    host,
    id,
    markerPath: path.join(packageRoot, 'initialized.txt'),
    packageName: `@acme/${id}`,
    packageRoot,
  };
}

async function enableFixtures(
  workspaceRoot: string,
  homeDir: string,
  fixtures: RuntimeFixture[],
): Promise<void> {
  for (const fixture of fixtures) await writeRuntime(fixture);
  writeCodeGraphyInstalledPluginCache({
    version: 3,
    plugins: fixtures.map(installedRecord),
  }, { homeDir });
  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...readCodeGraphyWorkspaceSettings(workspaceRoot),
    plugins: [
      { id: 'codegraphy.markdown', activation: 'disabled' },
      ...fixtures.map(fixture => ({ id: fixture.id, activation: 'enabled' as const })),
    ],
  });
}

describe('pipeline plugin sync failure isolation', () => {
  it('registers and initializes later Core plugins after one registration fails', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const broken = await createRuntimeFixture('core', 'acme.broken-core', '^99.0.0');
    const healthy = await createRuntimeFixture('core', 'acme.healthy-core', '^4.0.0');
    await enableFixtures(workspaceRoot, homeDir, [broken, healthy]);
    const registry = new PluginRegistry();

    await expect(syncWorkspacePipelinePlugins(registry, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
      warn: vi.fn(),
    })).resolves.toBeUndefined();

    expect(registry.get(healthy.id)?.plugin.id).toBe(healthy.id);
    await expect(fs.readFile(healthy.markerPath, 'utf8')).resolves.toBe('initialized');
  });

  it('registers and initializes later Extension plugins after one registration fails', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const broken = await createRuntimeFixture(
      'codegraphy.extension',
      'acme.broken-extension',
      '^99.0.0',
    );
    const healthy = await createRuntimeFixture(
      'codegraphy.extension',
      'acme.healthy-extension',
      '^1.0.0',
    );
    await enableFixtures(workspaceRoot, homeDir, [broken, healthy]);
    const registry = new PluginRegistry();

    await expect(syncWorkspacePipelinePlugins(registry, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
      warn: vi.fn(),
    })).resolves.toBeUndefined();

    expect(registry.extensionPlugins.get(healthy.id)?.plugin.id).toBe(healthy.id);
    await expect(fs.readFile(healthy.markerPath, 'utf8')).resolves.toBe('initialized');
  });
});
