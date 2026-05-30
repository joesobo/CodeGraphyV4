import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type {
  IFileAnalysisResult,
  IPlugin,
  IPluginAnalysisContext,
} from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  createCodeGraphyWorkspaceEngine,
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
          edgeType: 'reference',
          sourceId: 'configured-target',
          from: { kind: 'file', filePath },
          target: {
            kind: 'file',
            path: targetPath,
            pathKind: 'absolute',
            specifier: targetFile
          }
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
          edgeType: 'import',
          sourceId: 'line-reference',
          specifier: content.trim(),
          target: {
            kind: 'file',
            path: path.relative(workspaceRoot, targetPath),
            pathKind: 'workspace-relative',
            specifier: content.trim(),
          },
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

  it('keeps orphan files in the core index regardless of graph view settings', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.writeFile(path.join(workspaceRoot, 'orphan.txt'), 'unlinked\n', 'utf-8');
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      showOrphans: false,
    });

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      })],
      includeCorePlugins: false,
    });

    expect(result.graph.nodes.map(node => node.id)).toEqual(
      expect.arrayContaining(['source.txt', 'target.txt', 'orphan.txt']),
    );
    expect(result.graph.nodes.map(node => node.id)).not.toContain('.codegraphy');
  });

  it('keeps indexing state in core so changed files update the graph without full indexing', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.writeFile(path.join(workspaceRoot, 'target-2.txt'), 'done\n', 'utf-8');
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
      onFilesChanged: vi.fn<(files: Array<{ relativePath: string }>) => Promise<string[]>>(async () => []),
    };
    const plugin = {
      ...createTextPlugin(calls),
      async onFilesChanged(files: Array<{ relativePath: string }>) {
        calls.onFilesChanged(files);
        return [];
      },
    };
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
    });

    const initial = await engine.index();
    await fs.writeFile(path.join(workspaceRoot, 'source.txt'), 'target-2.txt\n', 'utf-8');
    const refreshed = await engine.applyChangedFiles([
      'source.txt',
    ]);

    expect(initial.graph.edges).toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target.txt',
      }),
    );
    expect(refreshed.graph.edges).toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target-2.txt',
      }),
    );
    expect(refreshed.graph.edges).not.toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target.txt',
      }),
    );
    expect(calls.onFilesChanged).toHaveBeenCalledWith([
      expect.objectContaining({ relativePath: 'source.txt' }),
    ]);
    expect(calls.onPostAnalyze).toHaveBeenCalledTimes(2);
    expect(calls.onPostAnalyze).toHaveBeenLastCalledWith(refreshed.graph);
    expect(calls.onWorkspaceReady).toHaveBeenCalledTimes(1);
    expect(calls.analyzeFile).toHaveBeenCalledTimes(4);
    expect(calls.analyzeFile).toHaveBeenLastCalledWith(
      path.join(workspaceRoot, 'source.txt'),
      'target-2.txt\n',
      path.resolve(workspaceRoot),
    );
    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, { plugins: [plugin] }).state).toBe('fresh');
  });

  it('passes provided plugin entry options through the core workspace engine', async () => {
    const workspaceRoot = await createWorkspace();
    const analyzeFile = vi.fn(async (
      filePath: string,
      _content: string,
      rootPath: string,
      context?: IPluginAnalysisContext,
    ): Promise<IFileAnalysisResult> => {
      if (!filePath.endsWith('source.txt')) {
        return { filePath, relations: [] };
      }

      const targetFile = String(context?.options?.targetFile ?? '');
      const targetPath = path.join(rootPath, targetFile);
      return {
        filePath,
        relations: [{
          edgeType: 'reference',
          sourceId: 'configured-target',
          specifier: targetFile,
          target: {
            kind: 'file',
            path: path.relative(rootPath, targetPath),
            pathKind: 'workspace-relative',
            specifier: targetFile,
          },
        }],
      };
    });
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [{
        plugin: {
          id: 'acme.configured',
          name: 'Configured Plugin',
          version: '1.0.0',
          apiVersion: '^2.0.0',
          supportedExtensions: ['.txt'],
          sources: [{
            id: 'configured-target',
            name: 'Configured Target',
            description: 'References the configured target file.',
          }],
          analyzeFile,
        },
        options: {
          targetFile: 'target.txt',
        },
      }],
    });

    const result = await engine.index();

    expect(result.graph.edges).toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target.txt',
        kind: 'reference',
      }),
    );
    expect(analyzeFile).toHaveBeenCalledWith(
      path.join(workspaceRoot, 'source.txt'),
      'target.txt\n',
      path.resolve(workspaceRoot),
      expect.objectContaining({
        options: {
          targetFile: 'target.txt',
        },
      }),
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

  it('honors disabled filter patterns from enabled workspace plugin entries', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.writeFile(path.join(workspaceRoot, 'ignored.txt'), 'target.txt\n', 'utf-8');

    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [{
        ...createTextPlugin(calls),
        defaultFilters: ['**/ignored.txt'],
      }],
      settings: {
        ...readCodeGraphyWorkspaceSettings(workspaceRoot),
        plugins: [{
          package: '@codegraphy-dev/plugin-text',
          disabledFilterPatterns: ['**/ignored.txt'],
        }],
      },
    });

    expect(result.files.map(file => file.relativePath)).toContain('ignored.txt');
    expect(calls.analyzeFile).toHaveBeenCalledWith(
      path.join(workspaceRoot, 'ignored.txt'),
      'target.txt\n',
      path.resolve(workspaceRoot),
    );
  });
});
