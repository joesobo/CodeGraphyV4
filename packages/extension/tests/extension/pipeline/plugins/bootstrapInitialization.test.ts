import { describe, expect, it } from 'vitest';
import {
  createRegistry,
  createWorkspace,
  createPackageFixtureRoot,
  createPluginPackage,
  listCoreTreeSitterGraphScopeCapabilities,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
  initializeWorkspacePipeline,
  fs,
  os,
  path,
} from './bootstrapFixture';

describe('pipeline/plugins/bootstrap initialization', () => {
  it('registers built-in plugins and initializes them when a workspace root exists', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
    });

    expect(registry.setCoreAnalyzeFileResult).toHaveBeenCalledOnce();
    expect(registry.setCoreGraphScopeCapabilitiesProvider).toHaveBeenCalledWith(
      listCoreTreeSitterGraphScopeCapabilities,
    );
    expect(registry.register).toHaveBeenCalledTimes(1);
    expect(registry.register.mock.calls.map(([, options]) => options)).toEqual([
      { builtIn: true, sourcePackage: '@codegraphy-dev/plugin-markdown' },
    ]);
    expect(
      registry.register.mock.calls.map(([plugin]) => plugin.id),
    ).toEqual(['codegraphy.markdown']);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
  });

  it('passes Markdown workspace options to the built-in Markdown plugin', async () => {
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
      plugins: [{
        id: 'acme.extension-bootstrap',
        enabled: true,
        options: {
          includeFrontmatter: false,
        },
      }, {
        id: 'codegraphy.markdown',
        enabled: true,
        options: {
          includeFrontmatter: true,
        },
      }],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    const markdownRegistration = registry.register.mock.calls.find(
      ([plugin]) => plugin.id === 'codegraphy.markdown',
    );

    expect(markdownRegistration?.[1]).toEqual({
      builtIn: true,
      sourcePackage: '@codegraphy-dev/plugin-markdown',
      options: {
        includeFrontmatter: true,
      },
    });
  });

  it('skips plugin initialization when no workspace root is available', async () => {
    const registry = createRegistry();

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => undefined,
    });

    expect(registry.register).toHaveBeenCalledTimes(1);
    expect(registry.initializeAll).not.toHaveBeenCalled();
  });
});
