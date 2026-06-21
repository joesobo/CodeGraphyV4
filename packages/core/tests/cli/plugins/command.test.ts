import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  readCodeGraphyInstalledPluginCache,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
} from '../../../src';
import { describe, expect, it } from 'vitest';

import { runPluginsCommand } from '../../../src/cli/plugins/command';

async function createPackage(
  root: string,
  packageName: string,
  packageJson: Record<string, unknown>,
  descriptor?: Record<string, unknown>,
): Promise<void> {
  const packageRoot = path.join(root, ...packageName.split('/'));
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({ name: packageName, ...packageJson }, null, 2)}\n`,
    'utf-8',
  );
  if (descriptor) {
    await fs.writeFile(
      path.join(packageRoot, 'codegraphy.json'),
      `${JSON.stringify(descriptor, null, 2)}\n`,
      'utf-8',
    );
  }
}

function createPluginRecord(
  packageName: string,
  packageRoot: string,
  pluginId = packageName,
): CodeGraphyInstalledPluginRecord {
  return {
    package: packageName,
    pluginId,
    version: '1.2.3',
    apiVersion: '^2.0.0',
    disclosures: [],
    defaultOptions: { includeTests: true },
    packageRoot,
  };
}

describe('plugins/command', () => {
  it('registers an explicitly named globally installed plugin package without enabling it', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-'));
    await createPackage(globalRoot, 'private-plugin', {
      version: '4.5.6',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    }, {
      id: 'private-plugin',
    });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'register',
      packageName: 'private-plugin',
    }, {
      cwd: () => workspaceRoot,
      homeDir,
      resolveGlobalPackageRoots: () => [globalRoot],
    });

    expect(result).toEqual({
      exitCode: 0,
      output: 'Registered private-plugin in ~/.codegraphy/plugins.json.',
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins.map(plugin => plugin.package)).toEqual([
      'private-plugin',
    ]);
    await expect(fs.stat(path.join(workspaceRoot, '.codegraphy', 'settings.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('links a private local plugin package without requiring global npm install', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-private-package-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-'));
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      `${JSON.stringify({
        name: '@acme/codegraphy-private-plugin',
        version: '0.1.0',
        codegraphy: {
          type: 'plugin',
          apiVersion: '^2.0.0',
        },
      }, null, 2)}\n`,
      'utf-8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'codegraphy.json'),
      `${JSON.stringify({
        id: 'acme.private',
        name: 'Acme Private',
      }, null, 2)}\n`,
      'utf-8',
    );

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'link',
      packageRoot,
    }, {
      cwd: () => workspaceRoot,
      homeDir,
    });

    expect(result).toEqual({
      exitCode: 0,
      output: `Linked @acme/codegraphy-private-plugin from ${packageRoot} into ~/.codegraphy/plugins.json.`,
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([
      expect.objectContaining({
        package: '@acme/codegraphy-private-plugin',
        pluginId: 'acme.private',
        packageRoot,
      }),
    ]);
    await expect(fs.stat(path.join(workspaceRoot, '.codegraphy', 'settings.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('rejects plugin packages that do not declare a static plugin id', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-'));
    await createPackage(globalRoot, 'private-plugin', {
      version: '4.5.6',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'register',
      packageName: 'private-plugin',
    }, {
      cwd: () => workspaceRoot,
      homeDir,
      resolveGlobalPackageRoots: () => [globalRoot],
    });

    expect(result).toEqual({
      exitCode: 1,
      output: "Package 'private-plugin' is missing codegraphy.json with a static plugin id.",
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([]);
  });

  it('enables and disables a cached plugin for one workspace', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    const record = createPluginRecord(
      '@codegraphy-dev/plugin-vue',
      '/global/@codegraphy-dev/plugin-vue',
      'codegraphy.vue',
    );
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [record],
    }, { homeDir });

    const enableResult = await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-vue',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(enableResult).toEqual({
      exitCode: 0,
      output: `Enabled codegraphy.vue for ${workspaceRoot}. Run \`codegraphy index ${workspaceRoot}\` to refresh the Graph Cache.`,
    });
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([
      { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true },
      {
        id: 'codegraphy.vue',
        enabled: true,
        options: { includeTests: true },
      },
    ]);

    const disableResult = await runPluginsCommand({
      name: 'plugins',
      action: 'disable',
      packageName: '@codegraphy-dev/plugin-vue',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(disableResult).toEqual({
      exitCode: 0,
      output: `Disabled codegraphy.vue for ${workspaceRoot}. Run \`codegraphy index ${workspaceRoot}\` to refresh the Graph Cache.`,
    });
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([
      { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true },
      {
        id: 'codegraphy.vue',
        enabled: false,
        options: { includeTests: true },
      },
    ]);
  });

  it('enables bundled Markdown without requiring it in the user installed plugin cache', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-markdown-'));

    const disableResult = await runPluginsCommand({
      name: 'plugins',
      action: 'disable',
      packageName: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      workspacePath: workspaceRoot,
    }, { homeDir });
    expect(disableResult.exitCode).toBe(0);
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
      enabled: false,
    }]);

    const enableResult = await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(enableResult).toEqual({
      exitCode: 0,
      output: `Enabled ${CODEGRAPHY_MARKDOWN_PLUGIN_ID} for ${workspaceRoot}. Run \`codegraphy index ${workspaceRoot}\` to refresh the Graph Cache.`,
    });
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
      enabled: true,
    }]);
  });

  it('lists disabled bundled Markdown without requiring it in the user installed plugin cache', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-markdown-'));

    await runPluginsCommand({
      name: 'plugins',
      action: 'disable',
      packageName: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      workspacePath: workspaceRoot,
    }, { homeDir });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'list',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(result.output).toContain('Enabled in workspace:\nnone');
    expect(result.output).toContain('Registered but disabled:');
    expect(result.output).toContain(`- ${CODEGRAPHY_MARKDOWN_PLUGIN_ID}`);
  });

  it('lists enabled workspace plugins separately from registered disabled plugins', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [
        createPluginRecord(
          '@codegraphy-dev/plugin-markdown',
          '/global/@codegraphy-dev/plugin-markdown',
          CODEGRAPHY_MARKDOWN_PLUGIN_ID,
        ),
        createPluginRecord(
          '@codegraphy-dev/plugin-vue',
          '/global/@codegraphy-dev/plugin-vue',
          'codegraphy.vue',
        ),
      ],
    }, { homeDir });
    await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-vue',
      workspacePath: workspaceRoot,
    }, { homeDir });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'list',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(result.output).toContain(`CodeGraphy plugins for ${workspaceRoot}`);
    expect(result.output).toContain('Enabled in workspace:');
    expect(result.output).toContain(`1. ${CODEGRAPHY_MARKDOWN_PLUGIN_ID}`);
    expect(result.output).toContain('2. codegraphy.vue');
    expect(result.output).toContain('Registered but disabled:');
    expect(result.output).not.toContain(`- ${CODEGRAPHY_MARKDOWN_PLUGIN_ID}`);
  });

  it('returns plugin help for unknown actions', async () => {
    await expect(runPluginsCommand({
      name: 'plugins',
      action: 'help',
    })).resolves.toEqual({
      exitCode: 0,
      output: [
        'CodeGraphy plugin commands',
        '',
        'Commands:',
        '  codegraphy plugins register <package>',
        '  codegraphy plugins link <package-root>',
        '  codegraphy plugins list [workspace]',
        '  codegraphy plugins enable <plugin-id-or-package> [workspace]',
        '  codegraphy plugins disable <plugin-id-or-package> [workspace]',
      ].join('\n'),
    });
  });

  it('turns plugin command exceptions into failed command output', async () => {
    await expect(runPluginsCommand({
      name: 'plugins',
      action: 'register',
      packageName: 'private-plugin',
    }, {
      resolveGlobalPackageRoots: () => ['/global'],
      registerInstalledPlugin: async () => {
        throw new Error('plugin package is broken');
      },
    })).resolves.toEqual({
      exitCode: 1,
      output: 'plugin package is broken',
    });
  });
});
