import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type {
  IFileAnalysisResult,
  IPluginAnalysisContext,
} from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  createCodeGraphyWorkspaceEngine,
  indexCodeGraphyWorkspace,
  readCodeGraphyWorkspaceStatus,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';
import {
  createPackageBackedPluginPackage,
  createTextPlugin,
  createWorkspace,
} from './workspaceFixture';

describe('indexCodeGraphyWorkspace plugin configuration', () => {
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
          kind: 'reference',
          sourceId: 'configured-target',
          fromFilePath: filePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: targetFile,
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
          apiVersion: '^4.0.0',
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
      id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
      activation: 'enabled',
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
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-options',
        version: '1.0.0',
        id: 'acme.options',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot,
        globallyEnabled: false,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'acme.options',
        activation: 'enabled',
        options: {
          targetFile: 'target.txt',
        },
      }],
    });

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      userHomeDir: homeDir,
    });
    const unchanged = await indexCodeGraphyWorkspace({
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
    expect(unchanged.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 0,
      deletedFiles: 0,
      reusedFiles: 2,
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
          id: 'codegraphy.test-text',
          activation: 'enabled',
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

  it('keeps settings-disabled provided plugins unloaded during indexing', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [createTextPlugin(calls)],
      settings: {
        ...readCodeGraphyWorkspaceSettings(workspaceRoot),
        plugins: [{
          id: 'codegraphy.test-text',
          activation: 'disabled',
        }],
      },
    });

    expect(calls.onPreAnalyze).not.toHaveBeenCalled();
    expect(calls.analyzeFile).not.toHaveBeenCalled();
    expect(calls.onPostAnalyze).not.toHaveBeenCalled();
    expect(calls.onWorkspaceReady).not.toHaveBeenCalled();
    expect(result.graph.edges).toEqual([]);
  });
});
