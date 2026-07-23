import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
    createCodeGraphyWorkspaceEngine,
    indexCodeGraphyWorkspace,
    readCodeGraphyWorkspaceSettings,
    readCodeGraphyWorkspaceStatus,
    readGraphCacheStatus,
    readWorkspaceAnalysisDatabaseSnapshot,
    writeCodeGraphyWorkspaceSettings,
} from '../../src';
import { writeCodeGraphyInstalledPluginCache } from '../../src/plugins/installedCache';
import { createTextPlugin, createWorkspace } from './workspaceFixture';

describe('indexCodeGraphyWorkspace indexing lifecycle', () => {
  it('indexes an explicit folder through core plugins and writes the workspace Graph Cache', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };
    const onUnload = vi.fn();

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [{ ...createTextPlugin(calls), onUnload }],
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
    expect(onUnload).toHaveBeenCalledOnce();
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
      interfaces: [{
        id: 'codegraphy.extension',
        data: { showOrphans: false },
      }],
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

  it('unloads one-shot plugins when indexing fails', async () => {
    const workspaceRoot = await createWorkspace();
    const onUnload = vi.fn();
    const plugin = {
      ...createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      }),
      onUnload,
    };

    await expect(indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
      logInfo: () => {
        throw new Error('logging failed');
      },
    })).rejects.toThrow('logging failed');

    expect(onUnload).toHaveBeenCalledOnce();
  });

  it('keeps the new cache fresh when an enabled installed plugin fails to initialize', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-failed-plugin-home-'));
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-failed-plugin-'));
    await fs.writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({
      name: '@acme/codegraphy-plugin-bad',
      version: '1.0.0',
      type: 'module',
      codegraphy: {
        plugins: [{
          id: 'acme.bad',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
        }],
      },
    }), 'utf8');
    await fs.writeFile(path.join(packageRoot, 'plugin.js'), `
      export default function createPlugin() {
        return {
          id: 'acme.bad',
          name: 'Bad Plugin',
          version: '1.0.0',
          apiVersion: '^4.0.0',
          supportedExtensions: ['.bad'],
          async initialize() { throw new Error('initialization failed'); }
        };
      }
    `, 'utf8');
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-bad',
        id: 'acme.bad',
        version: '1.0.0',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot,
        globallyEnabled: true,
      }],
    }, { homeDir });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await indexCodeGraphyWorkspace({ workspaceRoot, userHomeDir: homeDir, includeCorePlugins: false });

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, { userHomeDir: homeDir })).toEqual(
      expect.objectContaining({ state: 'fresh', staleReasons: [] }),
    );
  });

  it('keeps the new cache fresh when an explicit runtime plugin fails to initialize', async () => {
    const workspaceRoot = await createWorkspace();
    const plugin = {
      ...createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      }),
      id: 'acme.explicit-failure',
      async initialize() {
        throw new Error('initialization failed');
      },
    };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
    });

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, { plugins: [plugin] })).toEqual(
      expect.objectContaining({ state: 'fresh', staleReasons: [] }),
    );
  });

  it('keeps the persistent engine cache fresh when an explicit plugin fails to initialize', async () => {
    const workspaceRoot = await createWorkspace();
    const plugin = {
      ...createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      }),
      id: 'acme.engine-failure',
      async initialize() {
        throw new Error('initialization failed');
      },
    };
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await engine.index();

    expect(readCodeGraphyWorkspaceStatus(workspaceRoot, { plugins: [plugin] })).toEqual(
      expect.objectContaining({ state: 'fresh', staleReasons: [] }),
    );
    engine.dispose();
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

  it('reanalyzes reverse dependents when a target file changes', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };
    const plugin = createTextPlugin(calls);
    const engine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
    });

    await engine.index();
    await fs.writeFile(path.join(workspaceRoot, 'target.txt'), 'changed\n', 'utf-8');
    await engine.applyChangedFiles(['target.txt']);

    expect(calls.analyzeFile).toHaveBeenCalledTimes(4);
    expect(calls.analyzeFile).toHaveBeenNthCalledWith(
      4,
      path.join(workspaceRoot, 'source.txt'),
      'target.txt\n',
      path.resolve(workspaceRoot),
    );
  });

});
