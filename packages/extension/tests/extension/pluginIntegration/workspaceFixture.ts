import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';

const fixtureWorkspacePath = path.resolve(__dirname, '../../../test-fixtures/workspace');

export interface PluginIntegrationWorkspace {
  workspacePath: string;
  scratchPath: string;
  cleanup(): Promise<void>;
}

export interface PluginIntegrationPackage {
  homeDir: string;
  packageName: string;
  pluginId: string;
}

export async function createPluginIntegrationWorkspace(): Promise<PluginIntegrationWorkspace> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-plugin-integration-'));
  const workspacePath = path.join(tempRoot, 'workspace');
  await fs.cp(fixtureWorkspacePath, workspacePath, { recursive: true });

  return {
    workspacePath,
    scratchPath: tempRoot,
    cleanup: async () => {
      await fs.rm(tempRoot, { recursive: true, force: true });
    },
  };
}

export async function installPluginIntegrationPackage(
  workspacePath: string,
  scratchPath: string,
): Promise<PluginIntegrationPackage> {
  const homeDir = path.join(scratchPath, 'home');
  const packageName = '@acme/codegraphy-plugin-integration';
  const pluginId = 'acme.integration';
  const packageRoot = path.join(scratchPath, 'global', 'node_modules', '@acme', 'codegraphy-plugin-integration');

  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: packageName,
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
export default function createPlugin() {
  return {
    id: '${pluginId}',
    name: 'Integration Package Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.ts'],
    sources: [{
      id: 'integration-import',
      name: 'Integration Import',
      description: 'Adds a package-backed relationship for integration tests.'
    }],
    async analyzeFile(filePath, _content, workspaceRoot, context) {
      if (!filePath.endsWith('/src/index.ts')) {
        return { filePath, relations: [] };
      }

      const targetFile = typeof context?.options?.targetFile === 'string'
        ? context.options.targetFile
        : '';
      if (targetFile.length === 0) {
        return { filePath, relations: [] };
      }

      const targetPath = new URL(targetFile, \`file://\${workspaceRoot}/\`).pathname;
      return {
        filePath,
        relations: [{
          kind: 'import',
          sourceId: 'integration-import',
          fromFilePath: filePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: './utils'
        }]
      };
    }
  };
}
`,
    'utf-8',
  );

  writeCodeGraphyInstalledPluginCache({
    version: 1,
    plugins: [{
      package: packageName,
      version: '1.0.0',
      apiVersion: '^2.0.0',
      disclosures: [],
      packageRoot,
      defaultOptions: {
        targetFile: 'src/utils.ts',
      },
    }],
  }, { homeDir });
  writeCodeGraphyWorkspaceSettings(workspacePath, {
    ...readCodeGraphyWorkspaceSettings(workspacePath),
    plugins: [{
      package: '@codegraphy-dev/plugin-markdown',
    }, {
      package: packageName,
      options: {
        targetFile: 'src/utils.ts',
      },
    }],
  });

  return { homeDir, packageName, pluginId };
}
