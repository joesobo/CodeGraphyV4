import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IPlugin } from '@codegraphy/plugin-api';
import { describe, expect, it, vi } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  indexCodeGraphyWorkspace,
  readGraphCacheStatus,
  readCodeGraphyWorkspaceStatus,
  readCodeGraphyWorkspaceSettings,
  readWorkspaceAnalysisDatabaseSnapshot,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';

async function createWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-core-index-'));
  await fs.writeFile(path.join(workspaceRoot, 'source.txt'), 'target.txt\n', 'utf-8');
  await fs.writeFile(path.join(workspaceRoot, 'target.txt'), 'done\n', 'utf-8');
  return workspaceRoot;
}

async function createPackageBackedPluginPackage(
  packageRoot: string,
): Promise<void> {
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@acme/codegraphy-plugin-options',
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
        defaultOptions: {
          targetFile: 'target.txt',
        },
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
let preAnalyzeTargetFile = '';

export default function createPlugin() {
  return {
    id: 'acme.options',
    name: 'Options Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.txt'],
    sources: [{
      id: 'configured-target',
      name: 'Configured Target',
      description: 'References the target file configured in plugin options.'
    }],
    async onPreAnalyze(_files, _workspaceRoot, context) {
      preAnalyzeTargetFile = typeof context?.options?.targetFile === 'string'
        ? context.options.targetFile
        : '';
    },
    async analyzeFile(filePath, _content, workspaceRoot, context) {
      const targetFile = typeof context?.options?.targetFile === 'string'
        ? context.options.targetFile
        : '';
      if (!filePath.endsWith('source.txt') || targetFile.length === 0 || targetFile !== preAnalyzeTargetFile) {
        return { filePath, relations: [] };
      }

      const targetPath = new URL(targetFile, \`file://\${workspaceRoot}/\`).pathname;
      return {
        filePath,
        relations: [{
          kind: 'reference',
          sourceId: 'configured-target',
          fromFilePath: filePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: targetFile
        }]
      };
    }
  };
}
`,
    'utf-8',
  );
}

function createTextPlugin(calls: {
  onPreAnalyze: ReturnType<typeof vi.fn>;
  onPostAnalyze: ReturnType<typeof vi.fn>;
  onWorkspaceReady: ReturnType<typeof vi.fn>;
  analyzeFile: ReturnType<typeof vi.fn>;
}): IPlugin {
  return {
    id: 'codegraphy.test-text',
    name: 'Test Text',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.txt'],
    sources: [{
      id: 'line-reference',
      name: 'Line Reference',
      description: 'References target files from text lines.',
    }],
    async onPreAnalyze(files, workspaceRoot) {
      calls.onPreAnalyze(files, workspaceRoot);
    },
    onPostAnalyze(graph) {
      calls.onPostAnalyze(graph);
    },
    onWorkspaceReady(graph) {
      calls.onWorkspaceReady(graph);
    },
    async analyzeFile(filePath, content, workspaceRoot) {
      calls.analyzeFile(filePath, content, workspaceRoot);

      if (path.basename(filePath) !== 'source.txt') {
        return { filePath, relations: [] };
      }

      const targetPath = path.join(workspaceRoot, content.trim());
      return {
        filePath,
        relations: [{
          kind: 'import',
          sourceId: 'line-reference',
          fromFilePath: filePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: content.trim(),
        }],
      };
    },
  };
}

describe('indexCodeGraphyWorkspace', () => {
  it('indexes an explicit folder through core plugins and writes the workspace Graph Cache', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createTextPlugin(calls)],
      includeCorePlugins: false,
      showOrphans: true,
    });

    expect(result.workspaceRoot).toBe(path.resolve(workspaceRoot));
    expect(result.graph.nodes.map(node => node.id)).toEqual(
      expect.arrayContaining(['source.txt', 'target.txt']),
    );
    expect(result.graph.edges).toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target.txt',
        kind: 'import',
      }),
    );
    expect(calls.onPreAnalyze).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ relativePath: 'source.txt' }),
        expect.objectContaining({ relativePath: 'target.txt' }),
      ]),
      path.resolve(workspaceRoot),
    );
    expect(calls.analyzeFile).toHaveBeenCalledTimes(2);
    expect(calls.onPostAnalyze).toHaveBeenCalledWith(result.graph);
    expect(calls.onWorkspaceReady).toHaveBeenCalledWith(result.graph);
    expect(readGraphCacheStatus(workspaceRoot).state).toBe('available');
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath)).toEqual(
      expect.arrayContaining(['source.txt', 'target.txt']),
    );
  });

  it('enables and runs the Markdown plugin by default for a new workspace', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-core-markdown-'));
    await fs.writeFile(path.join(workspaceRoot, 'Home.md'), 'See [[Target.md]].\n', 'utf-8');
    await fs.writeFile(path.join(workspaceRoot, 'Target.md'), 'Done.\n', 'utf-8');

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    }]);
    expect(result.graph.edges).toContainEqual(
      expect.objectContaining({
        from: 'Home.md',
        to: 'Target.md',
        kind: 'reference',
      }),
    );
  });

  it('loads enabled npm plugin packages and delivers workspace options to plugin hooks', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-core-home-'));
    const packageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-package-')),
      'node_modules',
      '@acme',
      'codegraphy-plugin-options',
    );

    await createPackageBackedPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-options',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot,
        defaultOptions: {
          targetFile: 'target.txt',
        },
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        package: '@acme/codegraphy-plugin-options',
        options: {
          targetFile: 'target.txt',
        },
      }],
    });

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      userHomeDir: homeDir,
    });

    expect(result.graph.edges).toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target.txt',
        kind: 'reference',
      }),
    );
    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, { userHomeDir: homeDir })).toMatchObject({
      state: 'fresh',
      staleReasons: [],
    });
  });
});
