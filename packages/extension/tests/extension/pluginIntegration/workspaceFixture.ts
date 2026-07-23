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
  packageRoot: string;
  pluginId: string;
  graphViewContributionIds?: {
    projection: string;
    runtimeNode: string;
  };
}

interface InstallPluginIntegrationPackageOptions {
  graphViewContributions?: boolean;
  importMarkerPath?: string;
  packageName?: string;
  pluginId?: string;
  webviewContributions?: boolean;
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
  options: InstallPluginIntegrationPackageOptions = {},
): Promise<PluginIntegrationPackage> {
  const homeDir = path.join(scratchPath, 'home');
  const packageName = options.packageName ?? '@acme/codegraphy-plugin-integration';
  const pluginId = options.pluginId ?? 'acme.integration';
  const graphViewContributionIds = options.graphViewContributions === true
    ? {
      projection: 'acme.integration.runtime-projection',
      runtimeNode: 'acme.integration.runtime-nodes',
    }
    : undefined;
  const [packageScope, packageBasename] = packageName.split('/');
  const packageRoot = packageName.startsWith('@') && packageBasename
    ? path.join(scratchPath, 'global', 'node_modules', packageScope, packageBasename)
    : path.join(scratchPath, 'global', 'node_modules', packageName);

  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: packageName,
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        plugins: [{
          id: pluginId,
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
        }],
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
${options.importMarkerPath ? `
import fs from 'node:fs';
fs.writeFileSync(${JSON.stringify(options.importMarkerPath)}, 'imported\\n');
` : ''}
export default function createPlugin() {
  return {
    id: '${pluginId}',
    name: 'Integration Package Plugin',
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: ['.ts'],
    ${options.webviewContributions ? `
    webviewApiVersion: '^1.0.0',
    webviewContributions: {
      scripts: ['webview.js'],
      styles: ['webview.css']
    },
    ` : ''}
    sources: [{
      id: 'integration-import',
      name: 'Integration Import',
      description: 'Adds a package-backed relationship for integration tests.'
    }],
    ${graphViewContributionIds ? `
    graphView: {
      runtimeNodes: [{
        id: '${graphViewContributionIds.runtimeNode}',
        label: 'Runtime Nodes',
        createNodes() {
          return [];
        }
      }],
      projections: [{
        id: '${graphViewContributionIds.projection}',
        label: 'Runtime Projection',
        project({ visibleGraph }) {
          return visibleGraph;
        }
      }]
    },
    ` : ''}
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
  if (options.webviewContributions) {
    await fs.writeFile(
      path.join(packageRoot, 'webview.js'),
      'export function activate() {}\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'webview.css'),
      ':root { --integration-plugin-loaded: 1; }\n',
      'utf-8',
    );
  }

  writeCodeGraphyInstalledPluginCache({
    version: 3,
    plugins: [{
      package: packageName,
      version: '1.0.0',
      id: pluginId,
      host: 'core',
      entry: './plugin.js',
      apiVersion: '^4.0.0',
      packageRoot,
      globallyEnabled: false,
    }],
  }, { homeDir });
  writeCodeGraphyWorkspaceSettings(workspacePath, {
    ...readCodeGraphyWorkspaceSettings(workspacePath),
    plugins: [{
      id: 'codegraphy.markdown',
      activation: 'enabled',
    }, {
      id: pluginId,
      activation: 'enabled',
      options: {
        targetFile: 'src/utils.ts',
      },
    }],
  });

  return { homeDir, packageName, packageRoot, pluginId, graphViewContributionIds };
}
